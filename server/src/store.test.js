/**
 * store.test.js — Guards the validation path that used to corrupt board.json.
 *
 * Run with: npm test  (node --test, no framework needed)
 */

const test = require('node:test');
const assert = require('node:assert');
const store = require('./store');

const good = { id: 'a1', text: 'hi', color: 'mint', x: 10, y: 20 };

test('sanitizeNote rejects records that would crash the client', () => {
  for (const bad of [null, undefined, {}, { id: 'a' }, { id: 1, x: 0, y: 0 }, { id: 'a', x: NaN, y: 0 }]) {
    assert.strictEqual(store.sanitizeNote(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('sanitizeNote fills in missing text/color rather than dropping the note', () => {
  const n = store.sanitizeNote({ id: 'a1', x: 0, y: 0 });
  assert.deepStrictEqual(n, { id: 'a1', text: '', color: 'lemon', x: 0, y: 0 });
});

test('sanitizeNote caps runaway text', () => {
  assert.strictEqual(store.sanitizeNote({ ...good, text: 'x'.repeat(50000) }).text.length, 10000);
});

test('addNote drops malformed input and keeps good input', () => {
  const before = store.getNotes().length;
  assert.strictEqual(store.addNote(undefined), null);
  assert.strictEqual(store.getNotes().length, before);
  assert.deepStrictEqual(store.addNote(good), good);
  assert.strictEqual(store.getNotes().length, before + 1);
  store.deleteNote('a1');
});

test('editNote and moveNote reject bad types instead of writing them', () => {
  store.addNote(good);
  assert.strictEqual(store.editNote('a1', { evil: true }), null);
  assert.strictEqual(store.moveNote('a1', 'left', 5), null);
  assert.deepStrictEqual(store.getNotes().find((n) => n.id === 'a1'), good);
  store.deleteNote('a1');
});
