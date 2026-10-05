import assert from 'node:assert/strict';
import test from 'node:test';
import { displayValue, keepWellFormed, normalize, validate } from '../src/core/registration-fields.js';
import { createLogger } from '../src/core/logger.js';
import { minimalRegistration, sampleRegistration } from './test-helpers.js';

test('a complete registration is valid', () => {
  assert.deepEqual(validate(sampleRegistration()), {});
});

test('required fields, formats and ordering are checked', () => {
  const errors = validate(
    sampleRegistration({ visitorName: ' ', visitDate: '2026-02-30', startTime: '15:00', endTime: '14:00', building: 'moon-base' }),
  );
  assert.deepEqual(Object.keys(errors).sort(), ['building', 'endTime', 'visitDate', 'visitorName']);
});

test('a past date is rejected, optional fields may be empty', () => {
  assert.ok(validate(sampleRegistration({ visitDate: '2020-01-01' })).visitDate);
  assert.deepEqual(validate(minimalRegistration()), {});
});

test('rules that depend on another field', () => {
  const today = '2026-10-05'; // a Monday
  const check = (overrides) => Object.keys(validate(minimalRegistration({ visitDate: '2026-10-06', ...overrides }), { today }));
  assert.deepEqual(check({ visitorType: 'delivery' }), ['visitorCompany']);
  assert.deepEqual(check({ building: 'annex', floor: '4' }), ['floor']);
  assert.deepEqual(check({ building: 'annex', floor: '2', visitDate: '2026-10-10' }), ['visitDate'], 'annex is closed on Saturday');
  assert.deepEqual(check({ building: 'tower-b', floor: '2', visitDate: '2026-10-10' }), []);
  assert.deepEqual(check({ parking: 'yes' }), ['vehiclePlate']);
  assert.deepEqual(check({ vehiclePlate: '51A-123.45' }), ['vehiclePlate']);
  assert.deepEqual(check({ visitDate: '2026-11-05' }), ['visitDate'], 'more than 30 days ahead');
  assert.deepEqual(check({ startTime: '06:30', endTime: '19:30' }).sort(), ['endTime', 'startTime']);
  assert.deepEqual(check({ visitorPhone: '12345', companions: 'A\nB\nC\nD\nE', equipment: 'laptop,drone' }).sort(), ['companions', 'equipment', 'visitorPhone']);
});

test('lists, ticks and flags arrive in many shapes and end up canonical', () => {
  const reg = normalize({ companions: [' Vu Thi Hoa ', '', 'Pham Van Duc'], equipment: 'tools, laptop,tools', parking: true, floor: 7, purpose: 'line one\r\nline two' });
  assert.equal(reg.companions, 'Vu Thi Hoa\nPham Van Duc');
  assert.equal(reg.equipment, 'laptop,tools');
  assert.equal(reg.parking, 'yes');
  assert.equal(reg.floor, '7');
  assert.equal(reg.purpose, 'line one\nline two');
  assert.equal(normalize({ companions: 'A; B, C' }).companions, 'A\nB\nC');
  assert.equal(displayValue('equipment', reg), 'Laptop, Tools');
  assert.equal(displayValue('parking', normalize({})), 'No');
});

test('malformed suggestions are dropped rather than passed on', () => {
  const kept = keepWellFormed({
    visitorName: 'A', visitDate: 'tomorrow', startTime: '2pm', endTime: '15:00', building: 'x', extra: 'y',
    visitorType: 'vip', floor: 'third', visitorPhone: 'ask reception', equipment: ['camera', 'drone'], parking: 'maybe',
  });
  assert.equal(kept.visitorName, 'A');
  assert.equal(kept.endTime, '15:00');
  assert.equal(kept.equipment, 'camera');
  assert.equal(kept.visitDate + kept.startTime + kept.building + kept.visitorType + kept.floor + kept.visitorPhone + kept.parking, '');
  assert.equal('extra' in kept, false);
});

test('the logger redacts secret-looking fields at any depth', () => {
  const lines = [];
  createLogger((line) => lines.push(line)).info('x', { user: 'u', password: 'p', nested: { apiKey: 'k', sessionCookie: 'c' } });
  assert.doesNotMatch(lines[0], /"p"|"k"|"c"/);
  assert.match(lines[0], /"user":"u"/);
});
