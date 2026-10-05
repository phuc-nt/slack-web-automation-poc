// Optional convenience: turn a free-text request ("Register Ms. Tran tomorrow 2-3pm
// to meet Mr. Le at Tower A, floor 5") into suggested form values. The result only pre-fills
// the Slack form; the user still reviews every field.

import { addDays, BUILDINGS, EQUIPMENT, keepWellFormed, localToday, VISITOR_TYPES } from '../core/registration-fields.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const choices = (options) => options.map((o) => `"${o.value}" (${o.label})`).join(', ');

/** Weak models miscount weekdays, so the next two weeks are spelled out. */
function calendar(today) {
  return Array.from({ length: 15 }, (_, i) => {
    const date = addDays(today, i);
    const [y, m, d] = date.split('-').map(Number);
    return `${new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' })} ${date}`;
  }).join(', ');
}

function systemPrompt(today) {
  return `You extract building visitor registration details from a short request. The request may be in any language.
Today is the first date in this calendar: ${calendar(today)}.
Resolve relative dates ("tomorrow", "next Friday", "in 3 days") against it. A date without a year means its next occurrence.
Reply with one JSON object and nothing else, using exactly these keys:
- visitorType: one of ${choices(VISITOR_TYPES)}
- visitorName: the main visitor, without titles such as Mr. or Ms.
- visitorCompany
- visitorPhone
- companions: array of names of other people coming with the main visitor
- visitDate: YYYY-MM-DD
- startTime, endTime: HH:MM, 24-hour. If only a duration is given, compute endTime from startTime.
- building: one of ${choices(BUILDINGS)}
- floor: floor number as a string
- hostName: the person being visited, without titles
- purpose: short, in the language of the request
- equipment: array, any of ${choices(EQUIPMENT)}
- parking: "yes" only if the request asks for a parking space or says the visitor comes by car or motorbike, else ""
- vehiclePlate
Use an empty string (or an empty array) for anything the request does not state. Do not guess, and do not correct values that look wrong.`;
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The model did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

export async function parseFreeTextRequest(text, { apiKey, model, now = new Date(), timeoutMs = 20_000, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt(localToday(now)) },
        { role: 'user', content: text },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`LLM request failed with HTTP ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('The model returned an empty answer');
  return keepWellFormed(extractJson(content));
}
