// Run: node --test "EXTENSION/JOB TRACKER COPILOT/test/lib.test.cjs"
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../lib.js');

test('normalizeJobUrl = SQL jt_norm_url (Review Focus 1)', () => {
  assert.equal(L.normalizeJobUrl('https://www.onlinejobs.ph/jobseekers/job/Some-VA-123/?utm=x#top'),
    'https://www.onlinejobs.ph/jobseekers/job/some-va-123');
});
test('manilaToday uses Philippine time', () => assert.equal(L.manilaToday(new Date('2026-11-16T17:30:00Z')), '2026-11-17'));
test('hasPlaceholder', () => {
  assert.equal(L.hasPlaceholder('I can start [confirm start date].'), true);
  assert.equal(L.hasPlaceholder('No brackets here.'), false);
});
test('pickJobText (Review Focus 4)', () => {
  const long = 'x'.repeat(80);
  assert.equal(L.pickJobText({ text: long }, ''), long);
  assert.equal(L.pickJobText(null, long), long);
  assert.equal(L.pickJobText({ text: 'short' }, 'also short'), null);
});
test('errorCode (Review Focus 2)', () => {
  assert.equal(L.errorCode(401, { code: 'signed_out' }), 'signed_out');
  assert.equal(L.errorCode(403, { code: '28000' }), 'signed_out');
  assert.equal(L.errorCode(400, { code: 'JTNOP' }), 'no_profile');
  assert.equal(L.errorCode(429, { code: 'daily_cap' }), 'daily_cap');
  assert.equal(L.errorCode(503, { code: 'ai_busy' }), 'ai_busy');
  assert.equal(L.errorCode(500, {}), 'error');
});
test('retryText', () => {
  assert.equal(L.retryText(3601), 'about 2h');
  assert.equal(L.retryText(240), 'about 4 min');
});
