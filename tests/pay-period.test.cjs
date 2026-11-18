const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path) {
  const out = {};
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText)(out, () => load('src/lib/bills.ts'));
  return out;
}
const { periodEnd, billsReserved, isPayPeriod } = load('src/lib/pay-period.ts');
const { setBillRepeat, markBillPaid } = load('src/lib/bills.ts');
const period = (frequency, nextPayday) => ({ frequency, nextPayday });
test('weekly and biweekly roll on payday and cross DST/year boundaries', () => {
  assert.equal(periodEnd(period('weekly', '2026-11-13'), '2026-11-15'), '2026-11-20');
  assert.equal(periodEnd(period('biweekly', '2026-12-25'), '2026-12-25'), '2027-01-08');
  assert.equal(periodEnd(period('weekly', '2026-03-01'), '2026-03-08'), '2026-03-15');
});
test('monthly and two-month schedules retain the original day after February', () => {
  assert.equal(periodEnd(period('monthly', '2027-01-31'), '2027-02-01'), '2027-02-28');
  assert.equal(periodEnd(period('monthly', '2027-01-31'), '2027-02-28'), '2027-03-31');
  assert.equal(periodEnd(period('bimonthly', '2027-12-31'), '2028-01-01'), '2028-02-29');
});
test('twice monthly means the 1st and 15th, independently of a stale date anchor', () => {
  for (const [today, expected] of [['2026-11-01','2026-11-15'], ['2026-11-15','2026-12-01'], ['2026-12-31','2027-01-01']]) {
    assert.equal(periodEnd(period('semimonthly', '2020-01-05'), today), expected);
  }
});
test('reserve overdue and in-window bills, exclude payday and later bills', () => {
  const bills = ['2026-11-01','2026-11-15','2026-11-19','2026-11-20','2026-12-01'].map((date, i) => ({id: String(i), name:'Bill', amount:10, dueDate:date}));
  assert.equal(billsReserved(bills, period('weekly','2026-11-20'), '2026-11-15'), 30);
  assert.equal(billsReserved(bills, null, '2026-11-15'), 50);
});
test('project repeated payments using template amounts without mutating saved bills', () => {
  const bill = setBillRepeat({id:'one', name:'Bus', amount:5, dueDate:'2026-11-15'}, 'weekly');
  bill.recurrence.amount = 10;
  const before = JSON.stringify(bill);
  assert.equal(billsReserved([bill], period('monthly','2026-12-15'), '2026-11-15'), 45);
  assert.equal(JSON.stringify(bill), before);
  const paid = markBillPaid([bill], 'one', 'two');
  assert.equal(billsReserved(paid, period('monthly','2026-12-15'), '2026-11-15'), 40);
});
test('overdue recurring bills retain one outstanding payment and project only future payments', () => {
  const bill = setBillRepeat({id:'one', name:'Bus', amount:5, dueDate:'2026-10-25'}, 'weekly');
  assert.equal(billsReserved([bill], period('biweekly','2026-11-29'), '2026-11-15'), 15);
});
test('invalid frequencies and impossible dates are rejected', () => {
  for (const value of [null, {}, period('daily','2026-11-20'), period('monthly','2026-02-30')]) assert.equal(isPayPeriod(value), false);
});
