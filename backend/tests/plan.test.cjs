const test = require('node:test');
const assert = require('node:assert/strict');
const { planSchema } = require('../dist/schemas/plan');
const { profileSchema } = require('../dist/schemas/profile');
const { billSchema } = require('../dist/schemas/bill');
const base = {
  balance: 1234.56,
  savingsAmount: 75,
  savingsPercentage: null,
  billItems: [],
};

test('fixed amount plans calculate the reserved amount', () => {
  const plan = planSchema.parse(base);
  assert.equal(plan.savingsPercentage, null);
  assert.equal(plan.savingsAmount, 75);
  assert.equal(plan.savingsReserved, 75);
});

test('API computes a percentage reserve from the current balance', () => {
  const percentagePlan = { ...base, savingsAmount: null, savingsPercentage: 12.5 };
  assert.equal(planSchema.parse(percentagePlan).savingsReserved, 154.32);
  assert.equal(planSchema.parse({ ...percentagePlan, balance: -50 }).savingsReserved, 0);
});

test('API rejects invalid percentages', () => {
  for (const savingsPercentage of [-1, 101, '10']) {
    assert.equal(planSchema.safeParse({
      ...base,
      savingsAmount: null,
      savingsPercentage,
    }).success, false);
  }
});

test('legacy savingsGoal requests become fixed amounts', () => {
  const legacy = planSchema.parse({ balance: 500, savingsGoal: 80, billItems: [] });
  assert.equal(legacy.savingsAmount, 80);
  assert.equal(legacy.savingsPercentage, null);
  assert.equal(legacy.savingsReserved, 80);
});

test('API allows no savings but rejects two savings methods', () => {
  assert.equal(planSchema.safeParse({
    ...base,
    savingsAmount: null,
    savingsPercentage: null,
  }).success, true);
  assert.equal(planSchema.safeParse({
    ...base,
    savingsPercentage: 10,
  }).success, false);
});

test('tracking preferences and purchase history survive API validation', () => {
  const tracking = {
    trackingPreference: 'purchases',
    balanceUpdatedAt: '2026-09-15T12:00:00.000Z',
    purchases: [{ id: 'one', amount: 12.34, createdAt: '2026-09-15T12:00:00.000Z' }],
  };
  const plan = planSchema.parse({ ...base, ...tracking });
  assert.equal(plan.trackingPreference, 'purchases');
  assert.deepEqual(plan.purchases, tracking.purchases);
  assert.equal(plan.balance, base.balance, 'already-accounted purchases are not subtracted by the API');
  assert.equal(planSchema.parse(base).trackingPreference, null);
  assert.deepEqual(planSchema.parse(base).purchases, []);
  for (const invalid of [
    { trackingPreference: 'other' },
    { balanceUpdatedAt: 'yesterday' },
    { purchases: [{ ...tracking.purchases[0], amount: -1 }] },
    { purchases: [tracking.purchases[0], tracking.purchases[0]] },
  ]) assert.equal(planSchema.safeParse({ ...base, ...tracking, ...invalid }).success, false);
});


test('purchase descriptions are optional, trimmed, and limited to 120 characters', () => {
  const purchase = { id: 'one', amount: 4.5, createdAt: '2026-09-15T12:00:00.000Z' };
  assert.equal(planSchema.parse({ ...base, purchases: [{ ...purchase, note: ' Coffee ' }] }).purchases[0].note, 'Coffee');
  assert.equal(planSchema.safeParse({ ...base, purchases: [purchase] }).success, true);
  assert.equal(planSchema.safeParse({ ...base, purchases: [{ ...purchase, note: 'x'.repeat(121) }] }).success, false);
});

test('API preserves income kinds alongside legacy purchases without reapplying amounts', () => {
  const legacy = { id: 'coffee', amount: 4.5, createdAt: '2026-11-14T12:00:00.000Z' };
  const income = { ...legacy, id: 'pay', kind: 'income', amount: 200, note: 'Paycheck' };
  const input = { ...base, purchases: [income, legacy] };
  const saved = planSchema.parse(input);
  const loaded = planSchema.parse(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(loaded.purchases, [income, legacy]);
  assert.equal(loaded.balance, base.balance);
  for (const entry of [
    { ...income, kind: 'refund' }, { ...income, kind: null },
    { ...income, amount: 0 }, { ...income, amount: -20 },
    { ...income, note: 'x'.repeat(121) }, { ...income, createdAt: 'tomorrow' },
  ]) assert.equal(planSchema.safeParse({ ...base, purchases: [entry] }).success, false);
});

test('API preserves accurate balance check-ins and transaction snapshots', () => {
  const timestamp = '2026-11-15T12:00:00.000Z';
  const start = { id: 'start', kind: 'balance_check_in', amount: 0,
    balanceBefore: null, balanceAfter: 100, createdAt: timestamp };
  const checkIn = { ...start, id: 'check-in', amount: -20, balanceBefore: 100, balanceAfter: 80 };
  const income = { ...start, id: 'income', kind: 'income', amount: 50, balanceBefore: 80, balanceAfter: 130 };
  const purchase = { ...start, id: 'purchase', kind: 'purchase', amount: 10, balanceBefore: 130, balanceAfter: 120 };
  const purchases = [purchase, income, checkIn, start];
  assert.deepEqual(planSchema.parse({ ...base, balance: 120, purchases }).purchases, purchases);
  for (const entry of [
    { ...checkIn, amount: 0, balanceAfter: 100 },
    { ...checkIn, amount: -110, balanceAfter: -10 },
  ]) assert.equal(planSchema.safeParse({ ...base, purchases: [entry] }).success, true);
  for (const entry of [
    { ...checkIn, amount: 20 }, { ...checkIn, balanceBefore: undefined },
    { ...checkIn, balanceAfter: undefined }, { ...start, amount: 100 },
    { ...income, balanceBefore: null }, { ...purchase, balanceAfter: 140 },
  ]) assert.equal(planSchema.safeParse({ ...base, purchases: [entry] }).success, false);
});

test('recurring bill templates survive validation and keep only the supplied unpaid occurrence', () => {
  const bill = { id: 'rent', name: 'Rent', amount: 1000, dueDate: '2027-01-31', recurrence: {
    frequency: 'monthly', name: 'Rent', amount: 1100, anchorDate: '2027-02-28', nextDueDate: '2027-02-28',
  } };
  const plan = planSchema.parse({ ...base, billItems: [bill] });
  assert.deepEqual(plan.billItems, [bill]);
  assert.equal(plan.balance, base.balance, 'bill actions must not deduct from the balance');
  assert.equal(planSchema.parse({ ...base, billItems: [{ ...bill, recurrence: undefined }] }).billItems.length, 1);
  for (const invalid of [
    { ...bill, dueDate: '2027-02-30' }, { ...bill, recurrence: null },
    { ...bill, recurrence: { ...bill.recurrence, frequency: 'daily' } },
    { ...bill, recurrence: { ...bill.recurrence, nextDueDate: '2027-01-31' } },
    { ...bill, recurrence: { ...bill.recurrence, anchorDate: '2028-01-01' } },
    { ...bill, recurrence: { ...bill.recurrence, name: ' ' } },
    { ...bill, recurrence: { ...bill.recurrence, amount: -1 } },
  ]) assert.equal(billSchema.safeParse(invalid).success, false);
  assert.equal(planSchema.safeParse({ ...base, billItems: [bill, bill] }).success, false);
});

test('income-based reserves are independent of balance and mutually exclusive with legacy methods', () => {
  const input = { ...base, savingsAmount: null, savingsIncomePercentage: 10, incomeSavingsReserved: 200 };
  for (const balance of [1500, 100, 0, -20]) assert.equal(planSchema.parse({ ...input, balance }).savingsReserved, 200);
  assert.equal(planSchema.parse({ ...input, savingsIncomePercentage: 20 }).savingsReserved, 200);
  assert.equal(planSchema.parse(base).savingsIncomePercentage, null);
  assert.equal(planSchema.parse(base).incomeSavingsReserved, 0);
  for (const invalid of [
    { savingsIncomePercentage: -1 }, { savingsIncomePercentage: 101 }, { incomeSavingsReserved: -1 },
    { savingsAmount: 20 }, { savingsPercentage: 10 },
  ]) assert.equal(planSchema.safeParse({ ...input, ...invalid }).success, false);
});

test('income allocation metadata is optional for legacy records and bounded by received income', () => {
  const income = { id: 'pay', kind: 'income', amount: 100, createdAt: '2026-11-15T12:00:00.000Z', savingsAllocated: 10 };
  assert.equal(planSchema.parse({ ...base, purchases: [income] }).purchases[0].savingsAllocated, 10);
  for (const invalid of [{ ...income, savingsAllocated: 101 }, { ...income, savingsAllocated: -1 }, { ...income, kind: 'purchase' }]) {
    assert.equal(planSchema.safeParse({ ...base, purchases: [invalid] }).success, false);
  }
});

test('profiles require a trimmed display name and valid non-future date of birth', () => {
  assert.deepEqual(profileSchema.parse({
    displayName: '  Kevin Hu  ',
    dateOfBirth: '2000-02-29',
  }), {
    displayName: 'Kevin Hu',
    dateOfBirth: '2000-02-29',
  });
  for (const profile of [
    { displayName: 'K', dateOfBirth: '2000-01-01' },
    { displayName: 'Kevin Hu', dateOfBirth: '2000-02-30' },
    { displayName: 'Kevin Hu', dateOfBirth: '2999-01-01' },
  ]) assert.equal(profileSchema.safeParse(profile).success, false);
});


test('fixed-per-income and completed savings receipts validate without double deduction',()=>{
 const base={balance:1450,billItems:[],savingsIncomeAmount:50,incomeSavingsReserved:0};
 const income={id:'pay',kind:'income',amount:500,createdAt:'2026-11-15T12:00:00.000Z',balanceBefore:1000,balanceAfter:1500,savingsAllocated:50,savingsSavedAt:'2026-11-15T13:00:00.000Z'};
 const transfer={id:'saved-pay',kind:'savings_transfer',savingsSourceId:'pay',amount:50,createdAt:income.savingsSavedAt,balanceBefore:1500,balanceAfter:1450};
 const valid=planSchema.parse({...base,purchases:[transfer,income]});
 assert.equal(valid.savingsReserved,0);assert.equal(valid.balance,1450);
 for(const purchases of [[income],[transfer], [transfer, {...income,savingsAllocated:49}], [{...transfer,balanceAfter:1400},income]]) {
  assert.equal(planSchema.safeParse({...base,purchases}).success,false);
 }
 assert.equal(planSchema.safeParse({...base,savingsIncomePercentage:10,purchases:[]}).success,false);
});

test('activity revisions accept valid corrections and reject invalid counters', () => {
  const base={balance:100,savingsAmount:null,savingsPercentage:null,billItems:[]};
  assert.equal(planSchema.parse({...base,activityRevision:1}).activityRevision,1);
  for(const activityRevision of [-1,0.5,Infinity,Number.MAX_SAFE_INTEGER+1]) {
    assert.equal(planSchema.safeParse({...base,activityRevision}).success,false);
  }
});

test('CSV history metadata survives persistence and cannot masquerade as balance-changing activity', () => {
  const entry={id:'csv-test',kind:'purchase',amount:5,createdAt:'2026-11-01T12:00:00.000Z',note:'Coffee',historyOnly:true};
  assert.equal(planSchema.parse({...base,purchases:[entry]}).purchases[0].historyOnly,true);
  for(const extra of [{kind:'balance_check_in',amount:0,balanceBefore:null,balanceAfter:100},{balanceBefore:100,balanceAfter:95},{kind:'income',savingsAllocated:1}]) {
    assert.equal(planSchema.safeParse({...base,purchases:[{...entry,...extra}]}).success,false);
  }
});


test('pay periods validate all schedules, preserve anchors, and default legacy plans to null', () => {
  assert.equal(planSchema.parse(base).payPeriod, null);
  for (const frequency of ['weekly', 'biweekly', 'semimonthly', 'monthly', 'bimonthly']) {
    const payPeriod = { frequency, nextPayday: '2028-02-29' };
    assert.deepEqual(planSchema.parse({ ...base, payPeriod }).payPeriod, payPeriod);
  }
  for (const payPeriod of [{frequency:'daily', nextPayday:'2026-11-20'}, {frequency:'monthly', nextPayday:'2026-02-30'}, {frequency:'weekly'}]) {
    assert.equal(planSchema.safeParse({ ...base, payPeriod }).success, false);
  }
});
