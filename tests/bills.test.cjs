const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/bills.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exported = {};
new Function('exports', source)(exported);
const { nextBillDate, setBillRepeat, markBillPaid, updateBillTemplate, isValidBill, sameBill } = exported;
const base = { id: 'rent-jan', name: 'Rent', amount: 1000, dueDate: '2027-01-31' };

test('monthly bills keep their original day through short months and year boundaries', () => {
  assert.equal(nextBillDate('2027-01-31', 'monthly'), '2027-02-28');
  assert.equal(nextBillDate('2027-02-28', 'monthly', '2027-01-31'), '2027-03-31');
  assert.equal(nextBillDate('2028-01-31', 'monthly'), '2028-02-29');
  assert.equal(nextBillDate('2027-12-31', 'monthly'), '2028-01-31');
  assert.equal(nextBillDate('2027-01-30', 'monthly'), '2027-02-28');
  assert.equal(nextBillDate('2027-02-28', 'monthly', '2027-01-30'), '2027-03-30');
});

test('yearly leap-day schedules recover February 29 in the next leap year', () => {
  let date = '2024-02-29';
  for (const expected of ['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']) {
    date = nextBillDate(date, 'yearly', '2024-02-29');
    assert.equal(date, expected);
  }
});

test('weekly and fortnightly repeats cross DST, month, and year boundaries as calendar dates', () => {
  assert.equal(nextBillDate('2027-03-07', 'weekly'), '2027-03-14');
  assert.equal(nextBillDate('2027-12-25', 'biweekly'), '2028-01-08');
  assert.equal(nextBillDate('2028-02-23', 'weekly'), '2028-03-01');
  for (const value of ['2027-02-29', '2027-04-31', 'not a date', '2027-1-1']) {
    assert.throws(() => nextBillDate(value, 'monthly'));
  }
});

test('marking paid generates one next occurrence, preserves defaults, and ignores repeated IDs', () => {
  const recurring = setBillRepeat(base, 'monthly');
  const currentOnly = { ...recurring, name: 'Discounted rent', amount: 900, dueDate: '2027-01-30' };
  const input = [currentOnly];
  const next = markBillPaid(input, base.id, 'rent-feb');
  assert.equal(input[0].amount, 900, 'input snapshot remains untouched');
  assert.equal(next.length, 1, 'only one unpaid occurrence stays reserved');
  assert.equal(next[0].id, 'rent-feb');
  assert.equal(next[0].name, 'Rent');
  assert.equal(next[0].amount, 1000);
  assert.equal(next[0].dueDate, '2027-02-28');
  assert.equal(next[0].recurrence.nextDueDate, '2027-03-31');
  assert.equal(markBillPaid(next, base.id, 'duplicate'), next);
  assert.equal(markBillPaid(next, 'rent-feb', 'rent-mar')[0].dueDate, '2027-03-31');
});

test('overdue schedules advance one occurrence at a time and stopping preserves the unpaid bill', () => {
  const old = setBillRepeat({ ...base, dueDate: '2020-01-31' }, 'monthly');
  const next = markBillPaid([old], old.id, 'feb')[0];
  assert.equal(next.dueDate, '2020-02-29', 'does not skip overdue payments to today');
  const stopped = setBillRepeat(next, 'never');
  assert.equal(stopped.dueDate, next.dueDate);
  assert.equal(stopped.amount, next.amount);
  assert.equal(stopped.recurrence, undefined);
  assert.deepEqual(markBillPaid([stopped], stopped.id, 'unused'), []);
});

test('future template edits preserve current payment and become defaults for the next one', () => {
  const recurring = setBillRepeat(base, 'monthly');
  const edited = { ...recurring, recurrence: { frequency: 'weekly', name: 'New rent', amount: 1100,
    anchorDate: '2027-03-05', nextDueDate: '2027-03-05' } };
  assert.equal(edited.amount, 1000);
  assert.equal(edited.dueDate, base.dueDate);
  const next = markBillPaid([edited], edited.id, 'new')[0];
  assert.equal(next.amount, 1100);
  assert.equal(next.name, 'New rent');
  assert.equal(next.dueDate, '2027-03-05');
  assert.equal(next.recurrence.nextDueDate, '2027-03-12');
});

test('amount-only future edits preserve the original month-end anchor', () => {
  const bill = setBillRepeat(base, 'monthly');
  const updated = updateBillTemplate(bill, { ...bill.recurrence, amount: 1100 });
  assert.equal(updated.recurrence.anchorDate, '2027-01-31');
  const feb = markBillPaid([updated], updated.id, 'feb')[0];
  assert.equal(feb.amount, 1100);
  assert.equal(feb.dueDate, '2027-02-28');
  assert.equal(feb.recurrence.nextDueDate, '2027-03-31');
  const shifted = updateBillTemplate(bill, { ...bill.recurrence, nextDueDate: '2027-02-20' });
  assert.equal(shifted.recurrence.anchorDate, '2027-02-20');
});

test('bill validation accepts legacy one-time bills and rejects malformed repeat data', () => {
  assert.equal(isValidBill(base), true);
  const recurring = setBillRepeat(base, 'monthly');
  assert.equal(isValidBill(recurring), true);
  assert.equal(sameBill(recurring, JSON.parse(JSON.stringify(recurring))), true);
  assert.equal(sameBill(recurring, base), false);
  for (const bill of [
    { ...base, amount: -1 }, { ...base, dueDate: '2027-02-30' }, { ...base, recurrence: null },
    { ...recurring, recurrence: { ...recurring.recurrence, frequency: 'daily' } },
    { ...recurring, recurrence: { ...recurring.recurrence, nextDueDate: base.dueDate } },
    { ...recurring, recurrence: { ...recurring.recurrence, amount: -1 } },
  ]) assert.equal(isValidBill(bill), false);
});
