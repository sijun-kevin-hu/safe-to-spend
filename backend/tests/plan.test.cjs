const test = require('node:test');
const assert = require('node:assert/strict');
const { planSchema } = require('../dist/schemas/plan');
const { profileSchema } = require('../dist/schemas/profile');
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
