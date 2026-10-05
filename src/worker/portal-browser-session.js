// Drives the portal in a real browser: sign in, walk the registration wizard, stop on
// the confirmation screen. The final click is a separate call so that it only happens
// after a person approved it.

import { chromium } from 'playwright';
import { displayValue, FIELDS } from '../core/registration-fields.js';

const STEP_TIMEOUT_MS = 15_000;

export class PortalError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // login_failed | human_verification_required | form_rejected | mismatch | unexpected_page
  }
}

export class PortalBrowserSession {
  static async open({ baseUrl, headless = true }) {
    const browser = await chromium.launch({ headless });
    const context = await browser.newContext({ viewport: { width: 900, height: 1100 } });
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT_MS);
    return new PortalBrowserSession({ browser, page, baseUrl });
  }

  constructor({ browser, page, baseUrl }) {
    this.browser = browser;
    this.page = page;
    this.baseUrl = baseUrl;
  }

  async signIn({ username, password }) {
    const { page } = this;
    await page.goto(`${this.baseUrl}/login`);
    // A portal that asks for CAPTCHA or a one-time code cannot be automated; stop clearly.
    if (await page.locator('[data-testid="captcha"], iframe[src*="captcha"], input[autocomplete="one-time-code"]').count()) {
      throw new PortalError('human_verification_required', 'The portal asked for CAPTCHA or a one-time code');
    }
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForLoadState('domcontentloaded');
    if (!(await page.getByTestId('registration-form').count())) {
      throw new PortalError('login_failed', 'Sign-in to the portal failed');
    }
  }

  /** Fills the form and returns once the confirmation screen shows the same values. */
  async fillToConfirmation(registration) {
    const { page } = this;
    const field = (label) => page.getByLabel(label, { exact: true });
    const next = () => page.getByRole('button', { name: 'Next' }).click();
    const labelOf = (key, value) => FIELDS.find((f) => f.key === key).options.find((o) => o.value === value).label;

    // Step 1: visitor
    await page.getByRole('radio', { name: labelOf('visitorType', registration.visitorType), exact: true }).check();
    await field('Visitor name').fill(registration.visitorName);
    await field('Visitor company').fill(registration.visitorCompany);
    await field('Visitor phone').fill(registration.visitorPhone);
    const companions = registration.companions.split('\n').filter(Boolean);
    for (const [index, name] of companions.entries()) {
      await page.getByRole('button', { name: 'Add companion' }).click();
      await field(`Companion ${index + 1}`).fill(name);
    }
    await next();

    // Step 2: visit. The floor list is loaded after the building is chosen;
    // selectOption waits until the requested floor is available.
    await field('Visit date').fill(registration.visitDate);
    await field('Start time').fill(registration.startTime);
    await field('End time').fill(registration.endTime);
    await field('Building').selectOption(registration.building);
    await field('Floor').selectOption(registration.floor);
    await field('Host name').fill(registration.hostName);
    await field('Purpose').fill(registration.purpose);
    await next();

    // Step 3: access. The vehicle plate only appears once parking is ticked.
    for (const item of registration.equipment.split(',').filter(Boolean)) {
      await page.getByRole('checkbox', { name: labelOf('equipment', item), exact: true }).check();
    }
    if (registration.parking === 'yes') {
      await page.getByRole('checkbox', { name: 'Parking space needed' }).check();
      await field('Vehicle plate').fill(registration.vehiclePlate);
    }
    await page.getByRole('button', { name: 'Review' }).click();
    await page.waitForLoadState('domcontentloaded');

    if (!(await page.getByTestId('confirmation-table').count())) {
      const messages = await page.locator('[data-testid^="error-"]:not([data-testid="error-summary"])').allTextContents();
      if (messages.length) throw new PortalError('form_rejected', `The portal rejected the form: ${messages.join('; ')}`);
      throw new PortalError('unexpected_page', 'The portal did not show the confirmation screen');
    }

    // Read the confirmation screen back and compare with what was requested.
    const shown = {};
    for (const { key } of FIELDS) {
      shown[key] = (await page.getByTestId(`confirm-${key}`).textContent()).trim();
    }
    const mismatched = FIELDS.map((f) => f.key).filter((key) => shown[key] !== displayValue(key, registration));
    if (mismatched.length) {
      throw new PortalError('mismatch', `Confirmation screen differs from the request in: ${mismatched.join(', ')}`);
    }
    return { shown, screenshot: await page.screenshot({ fullPage: true }) };
  }

  /** The only place that submits. Returns the portal's reference code. */
  async submit() {
    const { page } = this;
    await page.getByTestId('submit-registration').click();
    await page.waitForLoadState('domcontentloaded');
    const reference = page.getByTestId('reference-code');
    if (!(await reference.count())) {
      const messages = await page.locator('[data-testid^="error-"]:not([data-testid="error-summary"])').allTextContents();
      if (messages.length) throw new PortalError('form_rejected', `The portal rejected the submission: ${messages.join('; ')}`);
      throw new PortalError('unexpected_page', 'The portal did not confirm the submission');
    }
    return { referenceCode: (await reference.textContent()).trim() };
  }

  async close() {
    await this.browser.close().catch(() => {});
  }
}
