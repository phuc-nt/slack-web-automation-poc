// Real browser against the mock portal: the worker must stop on the confirmation
// screen, and only an approval by the requester may create a record.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { createLogger } from '../src/core/logger.js';
import { minimalRegistration, sampleRegistration, startStack } from './test-helpers.js';

test('fills the form, stops before submit, then submits on approval', async () => {
  const stack = await startStack();
  try {
    const registration = sampleRegistration();
    const job = await stack.service.prepare({ requestedBy: 'U1', registration });
    assert.equal(stack.portal.submissions.length, 0, 'nothing may be submitted before approval');
    assert.ok((await fs.stat(job.screenshotPath)).size > 1000, 'a confirmation screenshot is saved');

    const { referenceCode } = await stack.service.approve(job.jobId, 'U1');
    assert.match(referenceCode, /^VR-\d{8}-\d{4}$/);
    assert.deepEqual(stack.portal.submissions, [{ referenceCode, ...registration }]);
  } finally {
    await stack.stop();
  }
});

test('a registration with only the required fields goes through the wizard', async () => {
  const stack = await startStack();
  try {
    const registration = minimalRegistration({ building: 'tower-b', floor: '3' });
    const job = await stack.service.prepare({ requestedBy: 'U1', registration });
    const { referenceCode } = await stack.service.approve(job.jobId, 'U1');
    assert.deepEqual(stack.portal.submissions, [{ referenceCode, ...registration }]);
  } finally {
    await stack.stop();
  }
});

test('a rule only the portal knows is reported with the portal\'s own message', async () => {
  const stack = await startStack();
  try {
    const first = await stack.service.prepare({ requestedBy: 'U1', registration: sampleRegistration() });
    // Someone else asks for the same visitor at an overlapping time while the first is still unsubmitted.
    const overlapping = sampleRegistration({ startTime: '15:00', endTime: '16:00', purpose: 'Follow-up' });
    const second = await stack.service.prepare({ requestedBy: 'U2', registration: overlapping });
    await stack.service.approve(first.jobId, 'U1');

    await assert.rejects(stack.service.approve(second.jobId, 'U2'), { code: 'form_rejected', message: /overlaps/ });
    await assert.rejects(stack.service.prepare({ requestedBy: 'U3', registration: overlapping }), { code: 'form_rejected', message: /overlaps/ });
    assert.equal(stack.portal.submissions.length, 1);
  } finally {
    await stack.stop();
  }
});

test('the same request cannot be created twice', async () => {
  const stack = await startStack();
  try {
    const registration = sampleRegistration();
    const job = await stack.service.prepare({ requestedBy: 'U1', registration });
    await assert.rejects(stack.service.prepare({ requestedBy: 'U1', registration }), { code: 'duplicate' });
    await stack.service.approve(job.jobId, 'U1');
    await assert.rejects(stack.service.prepare({ requestedBy: 'U1', registration }), { code: 'duplicate' });
    await assert.rejects(stack.service.approve(job.jobId, 'U1'), { code: 'not_found' });
    assert.equal(stack.portal.submissions.length, 1);
  } finally {
    await stack.stop();
  }
});

test('another user cannot approve, and cancelling submits nothing', async () => {
  const stack = await startStack();
  try {
    const job = await stack.service.prepare({ requestedBy: 'U1', registration: sampleRegistration() });
    await assert.rejects(stack.service.approve(job.jobId, 'U2'), { code: 'forbidden' });
    await stack.service.cancel(job.jobId, 'U1');
    assert.equal(stack.portal.submissions.length, 0);
  } finally {
    await stack.stop();
  }
});

test('invalid data never reaches the browser', async () => {
  const stack = await startStack();
  try {
    await assert.rejects(stack.service.prepare({ requestedBy: 'U1', registration: sampleRegistration({ endTime: '13:00' }) }), { code: 'invalid' });
  } finally {
    await stack.stop();
  }
});

test('a failed portal sign-in is reported and the password is not logged', async () => {
  const lines = [];
  const password = 'wrong-password-value';
  const stack = await startStack({ credentials: { username: 'test-operator', password }, logger: createLogger((l) => lines.push(l)) });
  try {
    await assert.rejects(stack.service.prepare({ requestedBy: 'U1', registration: sampleRegistration() }), { code: 'login_failed' });
    assert.ok(lines.some((l) => l.includes('job_failed')));
    assert.ok(!lines.join('\n').includes(password));
  } finally {
    await stack.stop();
  }
});
