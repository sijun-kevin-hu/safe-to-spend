const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { setTimeout: wait } = require('node:timers/promises');

// Exercise the actual TypeScript modules without adding a test-runner dependency.
function loadSource(path) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const output = {};
  new Function('exports', source)(output);
  return output;
}
const { Autosave } = loadSource('src/lib/autosave.ts');
const {
  calculateSavingsReserved,
  savingsError,
  savingsSetting,
} = loadSource('src/lib/plan.ts');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('percentage savings follow balance, round cents, and never reserve negative money', () => {
  assert.equal(calculateSavingsReserved(1234.56, null, 12.5), 154.32);
  assert.equal(calculateSavingsReserved(-200, null, 10), 0);
  assert.equal(calculateSavingsReserved(1000, 75, null), 75);
  assert.equal(calculateSavingsReserved(1000, null, null), 0);
  assert.equal(savingsError('percentage', '100'), '');
  for (const value of ['', '-1', '101', 'abc']) assert.ok(savingsError('percentage', value));
  assert.equal(savingsError('amount', ''), '');
});

test('savings choices produce nullable, mutually exclusive inputs', () => {
  assert.deepEqual(savingsSetting('amount', '75'), {
    savingsAmount: 75,
    savingsPercentage: null,
  });
  assert.deepEqual(savingsSetting('percentage', '10'), {
    savingsAmount: null,
    savingsPercentage: 10,
  });
  assert.deepEqual(savingsSetting('amount', ''), {
    savingsAmount: null,
    savingsPercentage: null,
  });
});

test('loading does not save; rapid edits coalesce into the latest value', async () => {
  const writes = [];
  const queue = new Autosave(0, async value => writes.push(value), () => {}, 5);
  queue.update(0);
  await wait(20);
  assert.deepEqual(writes, []);
  queue.update(1);
  queue.update(2);
  await wait(20);
  assert.deepEqual(writes, [2]);
  queue.dispose();
});

test('edits during a slow request are saved afterward, without concurrent writes', async () => {
  const first = deferred();
  const writes = [];
  const states = [];
  const queue = new Autosave(0, value => {
    writes.push(value);
    return value === 1 ? first.promise : Promise.resolve();
  }, state => states.push(state), 5);
  queue.update(1);
  await wait(20);
  queue.update(2);
  queue.update(3);
  await wait(20);
  assert.deepEqual(writes, [1]);
  first.resolve();
  await wait(20);
  assert.deepEqual(writes, [1, 3]);
  assert.equal(states.at(-1), 'saved');
  queue.dispose();
});

test('reverting to the original value during a write still persists the revert', async () => {
  const first = deferred();
  const writes = [];
  const queue = new Autosave(0, value => {
    writes.push(value);
    return value === 1 ? first.promise : Promise.resolve();
  }, () => {}, 5);
  queue.update(1);
  await wait(20);
  queue.update(0);
  first.resolve();
  await wait(20);
  assert.deepEqual(writes, [1, 0]);
  queue.dispose();
});

test('failed writes retry automatically; invalid drafts never reach storage', async () => {
  const writes = [];
  const states = [];
  const queue = new Autosave(0, async value => {
    writes.push(value);
    if (writes.length === 1) throw Error('Offline');
  }, state => states.push(state), 5, 10);
  queue.update(1);
  await wait(40);
  assert.deepEqual(writes, [1, 1]);
  assert.ok(states.includes('error'));
  assert.equal(states.at(-1), 'saved');
  queue.update(2);
  queue.update(null);
  await wait(20);
  assert.deepEqual(writes, [1, 1]);
  assert.equal(states.at(-1), 'invalid');
  queue.dispose();
});

test('disposing cancels queued writes and prevents an old account from retrying', async () => {
  const request = deferred();
  const writes = [];
  const queue = new Autosave(0, value => { writes.push(value); return request.promise; }, () => {}, 5, 5);
  queue.update(1);
  await wait(20);
  queue.update(2);
  queue.dispose();
  request.reject(Error('Offline'));
  await wait(20);
  assert.deepEqual(writes, [1]);
});
