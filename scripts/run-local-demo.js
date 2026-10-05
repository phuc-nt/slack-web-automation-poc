// The whole flow in a terminal, without Slack: free text -> LLM suggestions ->
// browser fills the mock portal -> you approve -> the portal returns a reference code.
//
//   npm run demo -- "Register guest Ms. Tran for tomorrow 2pm-3pm to meet Mr. Le at Tower A floor 5, purpose: audit"
//   npm run demo -- --yes "..."     (approve without asking)

import readline from 'node:readline/promises';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/core/logger.js';
import { addDays, displayValue, FIELDS, localToday, validate } from '../src/core/registration-fields.js';
import { RegistrationService } from '../src/core/registration-service.js';
import { parseFreeTextRequest } from '../src/llm/parse-free-text-request.js';
import { createMockPortal } from '../src/mock-portal/mock-portal-server.js';

const args = process.argv.slice(2);
const autoApprove = args.includes('--yes');
const text = args.filter((a) => a !== '--yes').join(' ') ||
  'Register guest Tran Thi Mai from Example Trading Co. with her colleague Pham Van Duc for tomorrow, 14:00 to 15:30, to meet Le Van Nam at Tower A floor 12 for a quarterly review. They bring a laptop and need parking for car 51A-123.45.';

const config = loadConfig();
const credentials = { username: 'demo-operator', password: 'demo-only-password' };
const portal = createMockPortal(credentials);
const portalBaseUrl = await portal.listen(0);
const service = new RegistrationService({
  portalBaseUrl,
  secretStore: { getPortalCredentials: async () => credentials },
  headless: config.headless,
  artifactsDir: config.artifactsDir,
  logger: createLogger(),
});

let exitCode = 0;
try {
  let registration;
  if (config.openRouterApiKey) {
    console.log(`\n1. Asking ${config.openRouterModel} to read: "${text}"`);
    registration = await parseFreeTextRequest(text, { apiKey: config.openRouterApiKey, model: config.openRouterModel });
  } else {
    console.log('\n1. OPENROUTER_API_KEY not set; using a fixed sample instead of the LLM.');
    registration = {
      visitorType: 'guest', visitorName: 'Tran Thi Mai', visitorCompany: 'Example Trading Co.', companions: 'Pham Van Duc',
      visitDate: addDays(localToday(), 1), startTime: '14:00', endTime: '15:30', building: 'tower-a', floor: '12',
      hostName: 'Le Van Nam', purpose: 'Quarterly review', equipment: 'laptop', parking: 'yes', vehiclePlate: '51A-123.45',
    };
  }
  for (const { key, label } of FIELDS) console.log(`   ${label.padEnd(22)} ${displayValue(key, registration) || '(empty)'}`);

  const errors = validate(registration);
  if (Object.keys(errors).length) {
    console.log('\n   In Slack the user would complete these fields in the form:');
    for (const message of Object.values(errors)) console.log(`   - ${message}`);
    exitCode = 1;
  } else {
    console.log(`\n2. Filling the portal at ${portalBaseUrl} …`);
    const job = await service.prepare({ requestedBy: 'local-user', registration });
    console.log(`   Stopped on the confirmation screen. Screenshot: ${job.screenshotPath}`);
    console.log(`   Records in the portal so far: ${portal.submissions.length}`);

    let approved = autoApprove;
    if (!autoApprove) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      approved = /^y/i.test(await rl.question('\n3. Submit this registration? (y/N) '));
      rl.close();
    }
    if (approved) {
      const { referenceCode } = await service.approve(job.jobId, 'local-user');
      console.log(`\n   Submitted. Reference code: ${referenceCode}`);
      console.log(`   Records in the portal now: ${JSON.stringify(portal.submissions)}`);
    } else {
      await service.cancel(job.jobId, 'local-user');
      console.log(`\n   Cancelled. Records in the portal: ${portal.submissions.length}`);
    }
  }
} catch (error) {
  console.error(`\nFailed: ${error.message}`);
  exitCode = 1;
} finally {
  await service.shutdown();
  await portal.close();
}
process.exit(exitCode);
