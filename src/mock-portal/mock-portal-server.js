// A stand-in for the real building-access portal: login, a registration wizard, a
// confirmation screen and a final submit. It exists only so the browser worker can be
// exercised end to end on a laptop.

import http from 'node:http';
import crypto from 'node:crypto';
import { BUILDINGS, FIELDS, normalize, validate } from '../core/registration-fields.js';
import { confirmationPage, loginPage, registrationPage, successPage } from './portal-pages.js';

function readForm(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) req.destroy();
    });
    req.on('end', () => resolve(new URLSearchParams(body)));
    req.on('error', reject);
  });
}

/** Companion rows and equipment ticks arrive as repeated form fields. */
function registrationFrom(form) {
  const input = Object.fromEntries(FIELDS.map(({ key }) => [key, form.get(key) ?? '']));
  return normalize({ ...input, companions: form.getAll('companion'), equipment: form.getAll('equipment') });
}

const FLOOR_LOOKUP_DELAY_MS = 150;
const sameVisitor = (a, b) => a.visitorName.toLowerCase() === b.visitorName.toLowerCase() && a.visitDate === b.visitDate;
const overlaps = (a, b) => a.startTime < b.endTime && b.startTime < a.endTime;

function sessionId(req) {
  const match = /(?:^|;\s*)portal_session=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return match ? match[1] : null;
}

export function createMockPortal({ username, password }) {
  const sessions = new Map(); // session id -> { draft }
  const submissions = []; // what was actually submitted; tests assert against this
  let counter = 0;

  const html = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  };
  const redirect = (res, location, headers = {}) => {
    res.writeHead(303, { location, ...headers });
    res.end();
  };

  const server = http.createServer(async (req, res) => {
    try {
      const { pathname, searchParams } = new URL(req.url, 'http://localhost');
      const route = `${req.method} ${pathname}`;

      if (route === 'GET /' || route === 'GET /login') return html(res, 200, loginPage());
      if (route === 'POST /login') {
        const form = await readForm(req);
        if (form.get('username') !== username || form.get('password') !== password) {
          return html(res, 401, loginPage('Invalid username or password'));
        }
        const id = crypto.randomBytes(16).toString('hex');
        sessions.set(id, { draft: null });
        return redirect(res, '/visitors/new', { 'set-cookie': `portal_session=${id}; HttpOnly; Path=/; SameSite=Lax` });
      }
      // Read-only view of submitted records, for local verification only.
      if (route === 'GET /api/submissions') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(submissions));
      }

      const session = sessions.get(sessionId(req));
      if (!session) return redirect(res, '/login');

      // A rule only the portal can know: it depends on what other people already registered.
      const conflictErrors = (values) =>
        submissions.some((s) => sameVisitor(s, values) && overlaps(s, values))
          ? { visitorName: 'This visitor already has a registration that overlaps this time' }
          : {};

      if (route === 'GET /api/floors') {
        const floors = BUILDINGS.find((b) => b.value === searchParams.get('building'))?.floors ?? 0;
        await new Promise((resolve) => setTimeout(resolve, FLOOR_LOOKUP_DELAY_MS));
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify(Array.from({ length: floors }, (_, i) => i + 1)));
      }

      if (route === 'GET /visitors/new') return html(res, 200, registrationPage(session.draft || {}));
      if (route === 'POST /visitors/confirm') {
        const values = registrationFrom(await readForm(req));
        const errors = { ...conflictErrors(values), ...validate(values) };
        if (Object.keys(errors).length) return html(res, 422, registrationPage(values, errors));
        session.draft = values;
        return html(res, 200, confirmationPage(values));
      }
      if (route === 'POST /visitors/submit') {
        if (!session.draft) return redirect(res, '/visitors/new');
        const errors = conflictErrors(session.draft);
        if (Object.keys(errors).length) return html(res, 409, registrationPage(session.draft, errors));
        counter += 1;
        const referenceCode = `VR-${session.draft.visitDate.replaceAll('-', '')}-${String(counter).padStart(4, '0')}`;
        submissions.push({ referenceCode, ...session.draft });
        session.draft = null;
        return html(res, 200, successPage(referenceCode));
      }
      return html(res, 404, 'Not found');
    } catch (error) {
      return html(res, 500, 'Portal error');
    }
  });

  return {
    submissions,
    listen(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
      });
    },
    close() {
      return new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      });
    },
  };
}
