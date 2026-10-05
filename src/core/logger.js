// JSON-lines logger that redacts secret-looking fields before anything is written.

const SECRET_KEY = /pass(word)?|secret|token|cookie|authorization|api[-_]?key/i;

export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? '[REDACTED]' : redact(v)]),
    );
  }
  return value;
}

export function createLogger(sink = (line) => console.log(line)) {
  const write = (level) => (event, fields = {}) =>
    sink(JSON.stringify({ time: new Date().toISOString(), level, event, ...redact(fields) }));
  return { info: write('info'), warn: write('warn'), error: write('error') };
}

export const silentLogger = createLogger(() => {});
