const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function loadApi(path) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const output = {};
  new Function('exports', 'require', source)(output, (name) => name === './bills' ? loadApi('src/lib/bills.ts') : ({
    supabase: { auth: { getSession: async () => ({ data: {
      session: { user: { id: 'preview' }, access_token: 'mock' },
    } }) } },
  }));
  return output;
}

const { requestPlan } = loadApi('src/lib/plan-api.ts');
const { requestProfile } = loadApi('src/lib/profile-api.ts');
const input = {
  balance: 87.66, savingsAmount: null, savingsPercentage: null, billItems: [],
  trackingPreference: 'purchases', balanceUpdatedAt: '2026-09-15T12:00:00.000Z',
  purchases: [{ id: 'one', amount: 12.34, createdAt: '2026-09-15T12:01:00.000Z' }],
};

test('save confirmation accepts JSONB key order but rejects missing tracking and wrong balances', async () => {
  const originalFetch = global.fetch;
  let response = { ...input, savingsReserved: 0, purchases: [{
    createdAt: input.purchases[0].createdAt, amount: 12.34, id: 'one',
  }] };
  global.fetch = async () => ({ ok: true, json: async () => response });
  try {
    assert.equal((await requestPlan('preview', input)).balance, 87.66);
    await assert.rejects(requestPlan('preview', {
      ...input, purchases: [{ ...input.purchases[0], note: 'Coffee' }],
    }), 'an old API must not silently discard a purchase description');
    response = { ...response, balance: 100 };
    await assert.rejects(requestPlan('preview', input));
    response = { balance: 87.66, savingsAmount: null, savingsPercentage: null, savingsReserved: 0, billItems: [] };
    await assert.rejects(requestPlan('preview', input));
    const legacy = await requestPlan('preview');
    assert.equal(legacy.supportsIncome, false);
    assert.equal(legacy.trackingPreference, null);
    assert.equal(legacy.balanceUpdatedAt, null);
    assert.deepEqual(legacy.purchases, []);
  } finally { global.fetch = originalFetch; }
});

test('profile loading supports incomplete accounts and confirms saved identity fields', async () => {
  const originalFetch = global.fetch;
  let response = null;
  global.fetch = async () => ({ ok: true, json: async () => response });
  try {
    assert.equal(await requestProfile('preview'), null);
    const profile = { displayName: 'Kevin Hu', dateOfBirth: '2000-02-29' };
    response = profile;
    assert.deepEqual(await requestProfile('preview', profile), profile);
    response = { ...profile, displayName: 'Someone Else' };
    await assert.rejects(requestProfile('preview', profile));
  } finally {
    global.fetch = originalFetch;
  }
});

test('income survives reload and save confirmation rejects APIs that discard its kind', async () => {
  const originalFetch = global.fetch;
  const plan = { ...input, balance: 300, purchases: [
    { ...input.purchases[0], id: 'pay', kind: 'income', amount: 200, note: 'Paycheck' },
    input.purchases[0],
  ] };
  let response = { ...plan, savingsReserved: 0, supportsIncome: true };
  global.fetch = async () => ({ ok: true, json: async () => response });
  try {
    assert.deepEqual((await requestPlan('preview', plan)).purchases, plan.purchases);
    assert.equal((await requestPlan('preview')).supportsIncome, true);
    assert.deepEqual((await requestPlan('preview')).purchases, plan.purchases);
    response = { ...response, purchases: plan.purchases.map(({ kind, ...entry }) => entry) };
    await assert.rejects(requestPlan('preview', plan), /did not save/);
    response = { ...response, purchases: [{ ...plan.purchases[0], kind: 'refund' }] };
    await assert.rejects(requestPlan('preview'), /invalid tracking data/);
  } finally { global.fetch = originalFetch; }
});

test('balance history survives reload and save confirmation checks before/after details', async () => {
  const originalFetch = global.fetch;
  const entry = { id: 'check-in', kind: 'balance_check_in', amount: -7.66,
    balanceBefore: 87.66, balanceAfter: 80, createdAt: input.balanceUpdatedAt };
  const plan = { ...input, balance: 80, purchases: [entry, ...input.purchases] };
  let response = { ...plan, savingsReserved: 0 };
  global.fetch = async () => ({ ok: true, json: async () => response });
  try {
    assert.deepEqual((await requestPlan('preview', plan)).purchases, plan.purchases);
    assert.deepEqual((await requestPlan('preview')).purchases[0], entry);
    response = { ...response, purchases: [{ ...entry, balanceBefore: 100 }] };
    await assert.rejects(requestPlan('preview'), /invalid tracking data/);
    response = { ...response, purchases: [{ ...entry, balanceBefore: undefined, balanceAfter: undefined }] };
    await assert.rejects(requestPlan('preview'), /invalid tracking data/);
    const income = { ...entry, id: 'pay', kind: 'income', amount: 20, balanceBefore: 80, balanceAfter: 100 };
    const withIncome = { ...input, balance: 100, purchases: [income] };
    response = { ...withIncome, savingsReserved: 0, purchases: [{ ...income, balanceBefore: undefined, balanceAfter: undefined }] };
    await assert.rejects(requestPlan('preview', withIncome), /did not save/);
  } finally { global.fetch = originalFetch; }
});

test('bill save confirmation preserves schedules and rejects APIs that drop recurrence', async () => {
  const originalFetch = global.fetch;
  const bill = { id: 'rent', name: 'Rent', amount: 1000, dueDate: '2027-01-31', recurrence: {
    frequency: 'monthly', name: 'Rent', amount: 1000, anchorDate: '2027-01-31', nextDueDate: '2027-02-28',
  } };
  const plan = { ...input, billItems: [bill] };
  let response = { ...plan, savingsReserved: 0, supportsRecurringBills: true, billItems: [{
    recurrence: { nextDueDate: '2027-02-28', anchorDate: '2027-01-31', amount: 1000, name: 'Rent', frequency: 'monthly' },
    dueDate: bill.dueDate, amount: 1000, name: 'Rent', id: 'rent',
  }] };
  global.fetch = async () => ({ ok: true, json: async () => response });
  try {
    assert.equal((await requestPlan('preview', plan)).supportsRecurringBills, true);
    assert.deepEqual((await requestPlan('preview')).billItems[0].recurrence, bill.recurrence);
    response = { ...response, billItems: [{ ...bill, recurrence: undefined }] };
    await assert.rejects(requestPlan('preview', plan), /did not save your bills/);
    response = { ...response, billItems: [{ ...bill, recurrence: { ...bill.recurrence, nextDueDate: '2027-01-01' } }] };
    await assert.rejects(requestPlan('preview'), /invalid plan/);
    response = { ...response, billItems: [bill, bill] };
    await assert.rejects(requestPlan('preview'), /invalid plan/);
  } finally { global.fetch = originalFetch; }
});

test('income savings and per-entry allocations survive reload and require exact save confirmation', async () => {
  const originalFetch = global.fetch;
  const plan = { ...input, balance: 1500, savingsIncomePercentage: 10, incomeSavingsReserved: 200,
    purchases: [{ id: 'pay', kind: 'income', amount: 500, createdAt: input.balanceUpdatedAt,
      balanceBefore: 1000, balanceAfter: 1500, savingsAllocated: 50 }] };
  let response = { ...plan, savingsReserved: 200, supportsIncomeSavings: true };
  global.fetch = async () => ({ ok: true, json: async () => response });
  try {
    const loaded = await requestPlan('preview', plan);
    assert.equal(loaded.savingsReserved, 200);
    assert.equal(loaded.supportsIncomeSavings, true);
    assert.equal((await requestPlan('preview')).incomeSavingsReserved, 200);
    response = { ...response, incomeSavingsReserved: 150 };
    await assert.rejects(requestPlan('preview', plan), /did not save your savings/);
    response = { ...response, incomeSavingsReserved: 200, purchases: [{ ...plan.purchases[0], savingsAllocated: undefined }] };
    await assert.rejects(requestPlan('preview', plan), /did not save your balance or transactions/);
    response = { ...response, purchases: [{ ...plan.purchases[0], savingsAllocated: 501 }] };
    await assert.rejects(requestPlan('preview'), /invalid tracking data/);
  } finally { global.fetch = originalFetch; }
});

test('fixed-income savings and transfer receipts require exact server confirmation', async () => {
  const originalFetch = global.fetch;
  const income = { id:'pay', kind:'income', amount:500, createdAt:input.balanceUpdatedAt, balanceBefore:1000, balanceAfter:1500, savingsAllocated:50, savingsSavedAt:input.balanceUpdatedAt };
  const transfer = { id:'saved-pay', kind:'savings_transfer', amount:50, createdAt:input.balanceUpdatedAt, balanceBefore:1500, balanceAfter:1450, savingsSourceId:'pay' };
  const plan = { ...input, balance:1450, savingsIncomeAmount:50, incomeSavingsReserved:0, purchases:[transfer,income] };
  let response = { ...plan, savingsReserved:0, supportsSavingsTasks:true };
  global.fetch = async () => ({ ok:true, json:async()=>response });
  try {
    assert.equal((await requestPlan('preview',plan)).supportsSavingsTasks,true);
    response = { ...response, savingsIncomeAmount:null };
    await assert.rejects(requestPlan('preview',plan), /did not save your savings/);
    response = { ...response, savingsIncomeAmount:50, purchases:[transfer,{...income,savingsSavedAt:undefined}] };
    await assert.rejects(requestPlan('preview',plan), /did not save your balance or transactions/);
    response = { ...response, purchases:[{...transfer,savingsSourceId:'wrong'},income] };
    await assert.rejects(requestPlan('preview',plan), /did not save your balance or transactions/);
  } finally { global.fetch=originalFetch; }
});
