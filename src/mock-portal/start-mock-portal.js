import { loadConfig } from '../config.js';
import { EnvSecretStore } from '../core/secret-store.js';
import { createMockPortal } from './mock-portal-server.js';

const config = loadConfig();
const credentials = await new EnvSecretStore().getPortalCredentials();
const url = await createMockPortal(credentials).listen(config.mockPortalPort);
console.log(`Mock portal listening on ${url} (submitted records: ${url}/api/submissions)`);
