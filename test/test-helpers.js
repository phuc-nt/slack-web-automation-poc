import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { localToday } from '../src/core/registration-fields.js';
import { RegistrationService } from '../src/core/registration-service.js';
import { createMockPortal } from '../src/mock-portal/mock-portal-server.js';

export const CREDENTIALS = { username: 'test-operator', password: 'test-only-password' };

export function tomorrow() {
  return localToday(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

/** Only the required fields: a walk-in guest with nothing optional. */
export function minimalRegistration(overrides = {}) {
  return sampleRegistration({
    visitorType: 'guest', visitorCompany: '', visitorPhone: '', companions: '', equipment: '', parking: '', vehiclePlate: '', ...overrides,
  });
}

export function sampleRegistration(overrides = {}) {
  return {
    visitorType: 'contractor',
    visitorName: 'Tran Thi Mai',
    visitorCompany: 'Example Trading Co.',
    visitorPhone: '+84 90 123 4567',
    companions: 'Pham Van Duc\nVu Thi Hoa',
    visitDate: tomorrow(),
    startTime: '14:00',
    endTime: '15:30',
    building: 'tower-a',
    floor: '12',
    hostName: 'Le Van Nam',
    purpose: 'Quarterly review meeting',
    equipment: 'laptop,tools',
    parking: 'yes',
    vehiclePlate: '51A-123.45',
    ...overrides,
  };
}

/** Starts a mock portal and a service pointed at it. Call stop() when done. */
export async function startStack({ credentials = CREDENTIALS, logger } = {}) {
  const portal = createMockPortal(CREDENTIALS);
  const portalBaseUrl = await portal.listen(0);
  const artifactsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'visitor-poc-'));
  const service = new RegistrationService({
    portalBaseUrl,
    secretStore: { getPortalCredentials: async () => credentials },
    artifactsDir,
    logger,
  });
  return {
    portal,
    service,
    portalBaseUrl,
    async stop() {
      await service.shutdown();
      await portal.close();
      await fs.rm(artifactsDir, { recursive: true, force: true });
    },
  };
}
