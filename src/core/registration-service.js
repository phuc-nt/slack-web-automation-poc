// Orchestrates one registration: validate -> fill the portal form -> wait for the
// requester's approval -> submit. Slack is one caller; the local demo and tests are others.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalize, validate } from './registration-fields.js';
import { silentLogger } from './logger.js';
import { PortalBrowserSession } from '../worker/portal-browser-session.js';

export class RegistrationError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code; // invalid | duplicate | not_found | forbidden | portal error codes
    this.details = details;
  }
}

export class RegistrationService {
  constructor({ portalBaseUrl, secretStore, headless = true, approvalTtlMs = 600_000, artifactsDir = 'artifacts', logger = silentLogger }) {
    Object.assign(this, { portalBaseUrl, secretStore, headless, approvalTtlMs, artifactsDir, logger });
    this.pending = new Map(); // jobId -> { requestedBy, registration, session, timer, key }
    this.activeKeys = new Map(); // idempotency key -> jobId, while a job is pending
    this.completedKeys = new Map(); // idempotency key -> reference code, after submit
  }

  /** Same requester + same content = same registration; it must not be created twice. */
  static idempotencyKey(requestedBy, registration) {
    return crypto.createHash('sha256').update(JSON.stringify([requestedBy, normalize(registration)])).digest('hex');
  }

  /** Fills the portal form and leaves the browser on the confirmation screen. */
  async prepare({ requestedBy, registration: input }) {
    const registration = normalize(input);
    const errors = validate(registration);
    if (Object.keys(errors).length) throw new RegistrationError('invalid', 'Registration data is invalid', errors);

    const key = RegistrationService.idempotencyKey(requestedBy, registration);
    if (this.activeKeys.has(key)) throw new RegistrationError('duplicate', 'The same registration is already waiting for approval');
    if (this.completedKeys.has(key)) {
      throw new RegistrationError('duplicate', `The same registration was already submitted (${this.completedKeys.get(key)})`);
    }

    const jobId = crypto.randomUUID();
    this.activeKeys.set(key, jobId);
    this.logger.info('job_started', { jobId, requestedBy });
    let session;
    try {
      session = await PortalBrowserSession.open({ baseUrl: this.portalBaseUrl, headless: this.headless });
      await session.signIn(await this.secretStore.getPortalCredentials());
      const { screenshot } = await session.fillToConfirmation(registration);

      await fs.mkdir(this.artifactsDir, { recursive: true });
      const screenshotPath = path.join(this.artifactsDir, `${jobId}-confirmation.png`);
      await fs.writeFile(screenshotPath, screenshot);

      const timer = setTimeout(() => this.#expire(jobId), this.approvalTtlMs);
      timer.unref?.();
      this.pending.set(jobId, { requestedBy, registration, session, timer, key });
      this.logger.info('job_awaiting_approval', { jobId });
      return { jobId, registration, screenshot, screenshotPath };
    } catch (error) {
      await session?.close();
      this.activeKeys.delete(key);
      this.logger.error('job_failed', { jobId, code: error.code ?? 'unexpected', message: error.message });
      throw error.code ? new RegistrationError(error.code, error.message) : error;
    }
  }

  /** Clicks the final submit. Only the person who requested the job may approve it. */
  async approve(jobId, approvedBy) {
    const job = this.#take(jobId, approvedBy);
    try {
      const { referenceCode } = await job.session.submit();
      this.completedKeys.set(job.key, referenceCode);
      this.logger.info('job_submitted', { jobId, referenceCode });
      return { referenceCode, registration: job.registration };
    } catch (error) {
      this.logger.error('job_failed', { jobId, code: error.code ?? 'unexpected', message: error.message });
      throw error.code ? new RegistrationError(error.code, error.message) : error;
    } finally {
      await job.session.close();
    }
  }

  /** The data of a job that is still waiting, for showing it to its requester again. */
  view(jobId, actor) {
    return this.#find(jobId, actor).registration;
  }

  async cancel(jobId, cancelledBy) {
    const job = this.#take(jobId, cancelledBy);
    await job.session.close();
    this.logger.info('job_cancelled', { jobId });
  }

  async shutdown() {
    for (const jobId of [...this.pending.keys()]) await this.#expire(jobId);
  }

  #find(jobId, actor) {
    const job = this.pending.get(jobId);
    if (!job) throw new RegistrationError('not_found', 'This request is no longer waiting for approval (expired, cancelled or already handled)');
    if (job.requestedBy !== actor) throw new RegistrationError('forbidden', 'Only the person who made the request can approve, edit or cancel it');
    return job;
  }

  #take(jobId, actor) {
    const job = this.#find(jobId, actor);
    this.pending.delete(jobId);
    this.activeKeys.delete(job.key);
    clearTimeout(job.timer);
    return job;
  }

  async #expire(jobId) {
    const job = this.pending.get(jobId);
    if (!job) return;
    this.pending.delete(jobId);
    this.activeKeys.delete(job.key);
    clearTimeout(job.timer);
    await job.session.close();
    this.logger.warn('job_expired', { jobId });
  }
}
