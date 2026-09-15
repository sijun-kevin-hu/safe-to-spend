const test = require('node:test');
const assert = require('node:assert/strict');
const { planSchema } = require('../dist/schemas/plan');
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
