// Secret access goes through this interface so the cloud deployment can swap in a
// managed secret service without touching the worker.

export class EnvSecretStore {
  constructor(env = process.env) {
    this.env = env;
  }

  async getPortalCredentials() {
    const username = this.env.PORTAL_USERNAME;
    const password = this.env.PORTAL_PASSWORD;
    if (!username || !password) {
      throw new Error('PORTAL_USERNAME and PORTAL_PASSWORD must be set');
    }
    return { username, password };
  }
}
