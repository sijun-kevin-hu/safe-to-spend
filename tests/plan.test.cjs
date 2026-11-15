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

const { recordPurchase, recordTransaction, updateTrackingBalance } = loadSource('src/lib/plan.ts');
test('income and purchases share history without reapplying entries after balance check-in', () => {
  const checkedAt = '2026-11-14T12:00:00.000Z';
  const income = { id: 'pay', kind: 'income', amount: 250.25, note: 'Paycheck', createdAt: checkedAt };
  const initial = { balance: -20, balanceUpdatedAt: checkedAt, purchases: [] };
  const received = recordTransaction(initial, income);
  assert.equal(received.balance, 230.25);
  assert.equal(received.balanceUpdatedAt, checkedAt);
  assert.deepEqual(received.purchases, [{ ...income, balanceBefore: -20, balanceAfter: 230.25 }]);
  assert.equal(recordTransaction(received, income), received, 'repeating an ID cannot add income twice');
  const spent = recordPurchase(received, { id: 'coffee', amount: 4.5, createdAt: checkedAt });
  assert.equal(spent.balance, 225.75);
  const refreshed = updateTrackingBalance(spent, 220, checkedAt);
  assert.deepEqual(refreshed.purchases.slice(1), spent.purchases);
  assert.equal(refreshed.purchases[0].balanceBefore, 225.75);
  assert.equal(refreshed.purchases[0].balanceAfter, 220);
  assert.equal(refreshed.purchases[0].amount, -5.75);
  const reloaded = JSON.parse(JSON.stringify(refreshed));
  assert.equal(recordTransaction(reloaded, income).balance, 220);
  assert.equal(calculateSavingsReserved(received.balance, 50, null), 50);
  assert.equal(calculateSavingsReserved(received.balance, null, 10), 23.03);
  for (const amount of [0, -1, NaN, Infinity, 1e13]) {
    assert.throws(() => recordTransaction(initial, { ...income, amount }));
  }
});

test('retrying an income snapshot persists the same balance and entry', async () => {
  const initial = { balance: 100, balanceUpdatedAt: null, purchases: [] };
  const received = recordTransaction(initial, {
    id: 'pay', kind: 'income', amount: 200, createdAt: '2026-11-14T12:00:00.000Z',
  });
  const writes = [];
  const queue = new Autosave(initial, async value => {
    writes.push(JSON.parse(JSON.stringify(value)));
    if (writes.length === 1) throw Error('Response lost');
  }, () => {}, 5, 10);
  queue.update(received);
  await wait(40);
  queue.dispose();
  assert.deepEqual(writes, [received, received]);
  assert.equal(writes[1].balance, 300);
  assert.equal(writes[1].purchases.length, 1);
});

test('purchase logging, balance refresh, and later purchases never double count', () => {
  const initial = { balance: 100, balanceUpdatedAt: null, purchases: [] };
  const now = '2026-09-15T12:00:00.000Z';
  const purchase = { id: 'one', amount: 12.34, createdAt: now };
  const logged = recordPurchase(initial, purchase);
  assert.equal(logged.balance, 87.66);
  assert.equal(recordPurchase(logged, purchase).balance, 87.66);
  const refreshed = updateTrackingBalance(logged, 80, now);
  assert.equal(refreshed.balance, 80);
  assert.equal(refreshed.purchases.length, 2);
  assert.equal(refreshed.balanceUpdatedAt, now);
  const next = recordPurchase(refreshed, { ...purchase, id: 'two', amount: 0.1 });
  assert.equal(next.balance, 79.9);
  assert.equal(next.balanceUpdatedAt, now, 'logging does not pretend the balance was checked');
  assert.equal(next.purchases.length, 3);
});

test('zero and negative balances work, while invalid purchases are rejected', () => {
  const state = { balance: 1, balanceUpdatedAt: null, purchases: [] };
  assert.equal(updateTrackingBalance(state, 0, 'now').balance, 0);
  assert.equal(updateTrackingBalance(state, -10, 'now').balance, -10);
  assert.throws(() => updateTrackingBalance(state, Infinity, 'now'));
  for (const amount of [0, -1, NaN, Infinity]) {
    assert.throws(() => recordPurchase(state, { id: 'one', amount, createdAt: 'now' }));
  }
  assert.equal(recordPurchase(state, { id: 'one', amount: 2, createdAt: 'now' }).balance, -1);
});

test('fixed reserve stays unchanged after purchases, balance updates, and reloads', () => {
  const setting = savingsSetting('amount', '150');
  const reserve = balance => calculateSavingsReserved(balance, setting.savingsAmount, setting.savingsPercentage);
  const initial = { balance: 1000, balanceUpdatedAt: null, purchases: [] };
  const purchased = recordPurchase(initial, { id: 'reserve-test', amount: 50, createdAt: '2026-10-25T12:00:00Z' });
  assert.equal(reserve(purchased.balance), 150);
  assert.equal(purchased.balance - reserve(purchased.balance), 800);
  const refreshed = updateTrackingBalance(purchased, 2000, '2026-10-26T12:00:00Z');
  assert.equal(reserve(refreshed.balance), 150);
  assert.equal(reserve(0), 150);
  const reloaded = JSON.parse(JSON.stringify(setting));
  assert.equal(calculateSavingsReserved(2000, reloaded.savingsAmount, reloaded.savingsPercentage), 150);
  const cleared = savingsSetting('amount', '');
  assert.equal(calculateSavingsReserved(2000, cleared.savingsAmount, cleared.savingsPercentage), 0);
});

test('balance check-ins record starting, unchanged, zero, and negative balances exactly once', () => {
  const time = '2026-11-15T12:00:00.000Z';
  const initial = { balance: 0, balanceUpdatedAt: null, purchases: [] };
  const started = updateTrackingBalance(initial, 100, time, 'start');
  assert.deepEqual(started.purchases[0], {id:'start',kind:'balance_check_in',createdAt:time,
    amount:0,balanceBefore:null,balanceAfter:100});
  assert.equal(updateTrackingBalance(started,100,time,'start'),started);
  const unchanged = updateTrackingBalance(started,100,time,'same');
  assert.equal(unchanged.purchases[0].amount,0);
  const zero = updateTrackingBalance(unchanged,0,time,'zero');
  assert.equal(zero.purchases[0].amount,-100);
  const negative = updateTrackingBalance(zero,-12.34,time,'negative');
  assert.equal(negative.purchases[0].balanceBefore,0);
  assert.equal(negative.purchases[0].balanceAfter,-12.34);
  assert.equal(negative.purchases[0].amount,-12.34);
  assert.equal(negative.purchases.length,4);
  const spent = recordPurchase(negative,{id:'spend',amount:0.1,createdAt:time});
  assert.equal(spent.purchases[0].balanceBefore,-12.34);
  assert.equal(spent.purchases[0].balanceAfter,-12.44);
  assert.equal(spent.balanceUpdatedAt,time);
});
