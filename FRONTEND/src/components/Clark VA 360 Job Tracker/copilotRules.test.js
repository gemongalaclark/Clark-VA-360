// Run: node --test "FRONTEND/src/components/Clark VA 360 Job Tracker/copilotRules.test.js"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_FIELDS, CUSTOM_MAX, withDefaults, cleanAnswers } from './copilotRules.js';

test('answer fields, in order', () => {
  assert.deepEqual(ANSWER_FIELDS.map(f => f.key), ['first_name', 'portfolio_url', 'resume_url', 'rate', 'hours_per_week',
    'schedule', 'start', 'internet', 'equipment', 'va_experience']);
});
test('defaults fill only empty links', () => {
  assert.equal(withDefaults({ portfolio_url: '' }).portfolio_url, 'https://www.clarkva360.site');
  assert.equal(withDefaults({ resume_url: 'https://x.test/cv.pdf' }).resume_url, 'https://x.test/cv.pdf');
});
test('cleanAnswers mirrors the database rules', () => {
  const a = cleanAnswers({ first_name: '  Clark ', bogus: 1, custom: [{ question: 'Q', answer: 'A' }, { question: '', answer: 'x' }] });
  assert.equal(a.first_name, 'Clark');
  assert.equal('bogus' in a, false);
  assert.equal(a.custom.length, 1);
  const many = Array.from({ length: 40 }, (_, i) => ({ question: `q${i}`, answer: 'a' }));
  assert.equal(cleanAnswers({ custom: many }).custom.length, CUSTOM_MAX);
});
