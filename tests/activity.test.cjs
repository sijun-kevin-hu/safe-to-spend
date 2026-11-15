const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path) { const exports = {}; new Function('exports', ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(exports); return exports; }
const { reviseActivity } = load('src/lib/activity.ts');
const { updateTrackingBalance, recordTransaction, markSavingsSaved } = load('src/lib/plan.ts');
const time = '2026-11-15T12:00:00.000Z';
const start = () => updateTrackingBalance({ balance:0, balanceUpdatedAt:null, purchases:[], incomeSavingsReserved:0 }, 100, time, 'start');
const purchase = (state, amount=10, id='purchase') => recordTransaction(state, {id,kind:'purchase',amount,createdAt:time});
const income = (state) => recordTransaction(state, {id:'income',kind:'income',amount:100,createdAt:time},10);
const edit = (amount, extra={}) => ({amount,note:'Corrected',...extra});

test('purchase corrections adjust current balance and snapshots; deletion reverses spending', () => {
 const state = purchase(purchase(start()),5,'later');
 const changed = reviseActivity(state,'purchase',edit(20));
 assert.equal(changed.balance,75); assert.equal(changed.purchases[0].balanceBefore,80);
 assert.equal(changed.purchases[1].balanceAfter,80); assert.equal(changed.activityRevision,1);
 assert.equal(reviseActivity(state,'purchase',null).balance,95);
 assert.equal(state.balance,85,'input stays unchanged');
});
test('later balance check-ins anchor the result after historical edits or deletions', () => {
 const state = purchase(updateTrackingBalance(purchase(start()),80,time,'check'),5,'later');
 const changed = reviseActivity(state,'purchase',edit(30));
 assert.equal(changed.balance,75); assert.equal(changed.purchases[1].amount,10);
 assert.equal(reviseActivity(state,'check',edit(60)).balance,55);
 assert.equal(reviseActivity(state,'check',null).balance,85);
 assert.equal(reviseActivity(state,'purchase',null).balance,75);
});
test('starting and negative balances can be edited and removed', () => {
 const state=purchase(start());
 assert.equal(reviseActivity(state,'start',edit(-20)).balance,-30);
 const deleted=reviseActivity(state,'start',null);
 assert.equal(deleted.balance,-10); assert.equal(deleted.balanceUpdatedAt,null);
 assert.equal(reviseActivity(start(),'start',null).balance,0);
});
test('income corrections update pending savings without using today’s savings rate', () => {
 const state=income(start());
 const changed=reviseActivity(state,'income',edit(50,{savingsAllocated:5}));
 assert.equal(changed.balance,150); assert.equal(changed.incomeSavingsReserved,5);
 const deleted=reviseActivity(state,'income',null);
 assert.equal(deleted.balance,100); assert.equal(deleted.incomeSavingsReserved,0);
 assert.equal(reviseActivity(state,'income',edit(5)).incomeSavingsReserved,5);
});
test('completed income and transfer corrections keep linked receipts consistent', () => {
 const state=markSavingsSaved(income(start()),'income',time);
 assert.equal(state.balance,190);
 const changed=reviseActivity(state,'income',edit(50,{savingsAllocated:5}));
 assert.equal(changed.balance,145); assert.equal(changed.purchases[0].amount,5);
 const removed=reviseActivity(state,'income',null);
 assert.equal(removed.balance,100); assert.equal(removed.incomeSavingsReserved,0);
 assert.equal(removed.purchases.some(e=>e.kind==='savings_transfer'),false);
 const undone=reviseActivity(state,'saved-income',null);
 assert.equal(undone.balance,200); assert.equal(undone.incomeSavingsReserved,10);
 assert.equal(undone.purchases.find(e=>e.id==='income').savingsSavedAt,undefined);
 const resized=reviseActivity(state,'saved-income',edit(5));
 assert.equal(resized.balance,195); assert.equal(resized.purchases.find(e=>e.id==='income').savingsAllocated,5);
 assert.throws(()=>reviseActivity(state,'saved-income',edit(101)));
});
test('carryover transfers return the reserve and legacy activity keeps unknown snapshots', () => {
 const state=markSavingsSaved({...start(),incomeSavingsReserved:20},'carryover',time);
 assert.equal(reviseActivity(state,state.purchases[0].id,null).incomeSavingsReserved,20);
 const legacy={balance:90,balanceUpdatedAt:time,purchases:[{id:'old',amount:10,createdAt:time}]};
 const changed=reviseActivity(legacy,'old',edit(20));
 assert.equal(changed.balance,80); assert.equal(changed.purchases[0].balanceBefore,undefined);
 assert.equal(reviseActivity(legacy,'old',null).balance,100);
});
test('invalid amounts, notes and unavailable reserve are rejected', () => {
 for(const amount of [NaN,Infinity,0,-1,1e13]) assert.throws(()=>reviseActivity(purchase(start()),'purchase',edit(amount)));
 assert.throws(()=>reviseActivity(start(),'missing',null));
 assert.throws(()=>reviseActivity(income(start()),'income',edit(20,{savingsAllocated:21})));
 assert.throws(()=>reviseActivity(purchase(start()),'purchase',{amount:10,note:'x'.repeat(121)}));
 assert.throws(()=>reviseActivity({...income(start()),incomeSavingsReserved:0},'income',null));
});
