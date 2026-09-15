const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/plan-api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const output = {};
new Function('exports', 'require', source)(output, () => ({
  supabase: { auth: { getSession: async () => ({ data: {
    session: { user: { id: 'preview' }, access_token: 'mock' },
  } }) } },
}));
const { requestPlan } = output;
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
    response = { ...response, balance: 100 };
    await assert.rejects(requestPlan('preview', input));
    response = { balance: 87.66, savingsAmount: null, savingsPercentage: null, savingsReserved: 0, billItems: [] };
    await assert.rejects(requestPlan('preview', input));
    const legacy = await requestPlan('preview');
    assert.equal(legacy.trackingPreference, null);
    assert.equal(legacy.balanceUpdatedAt, null);
    assert.deepEqual(legacy.purchases, []);
  } finally { global.fetch = originalFetch; }
});
