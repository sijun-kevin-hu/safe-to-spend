const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const output={};
new Function('exports',ts.transpileModule(fs.readFileSync('src/lib/plan.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(output);
const {recordTransaction,updateTrackingBalance,calculateSavingsReserved,savingsSetting,savingsError}=output;
const time='2026-11-15T12:00:00.000Z';
const initial={balance:1000,balanceUpdatedAt:time,purchases:[],incomeSavingsReserved:150};
const income={id:'pay',kind:'income',amount:500,createdAt:time};

test('only newly logged income adds to the accumulated reserve, exactly once',()=>{
 const received=recordTransaction(initial,income,10);
 assert.equal(received.balance,1500);
 assert.equal(received.incomeSavingsReserved,200);
 assert.equal(received.purchases[0].savingsAllocated,50);
 assert.equal(recordTransaction(received,income,10),received);
 assert.equal(calculateSavingsReserved(received.balance,null,null,10,received.incomeSavingsReserved),200);
 const spent=recordTransaction(received,{id:'coffee',kind:'purchase',amount:25,createdAt:time},10);
 assert.equal(spent.balance,1475);assert.equal(spent.incomeSavingsReserved,200);
 assert.equal(spent.purchases[0].savingsAllocated,undefined);
 const checked=updateTrackingBalance(spent,1400,time,'check');
 assert.equal(checked.incomeSavingsReserved,200);assert.equal(checked.balance,1400);
 assert.equal(checked.purchases[0].savingsAllocated,undefined);
});

test('changing the rate applies prospectively and keeps previous allocations unchanged',()=>{
 const first=recordTransaction(initial,income,10);
 const reloaded=JSON.parse(JSON.stringify(first));
 const next=recordTransaction(reloaded,{...income,id:'second',amount:100},20);
 assert.equal(next.incomeSavingsReserved,220);
 assert.equal(next.purchases[0].savingsAllocated,20);
 assert.equal(next.purchases[1].savingsAllocated,50);
 assert.equal(calculateSavingsReserved(-1,null,null,20,220),220,'spending cannot silently release the reserve');
});

test('cent rounding and 0/100 percent allocations keep reserve and balance separate',()=>{
 const zero=recordTransaction({...initial,incomeSavingsReserved:0},income,0);
 assert.equal(zero.incomeSavingsReserved,0);assert.equal(zero.purchases[0].savingsAllocated,0);
 const all=recordTransaction({...initial,incomeSavingsReserved:0},income,100);
 assert.equal(all.incomeSavingsReserved,500);assert.equal(all.balance,1500);
 const small=recordTransaction({...initial,incomeSavingsReserved:0},{...income,amount:0.1},5);
 assert.equal(small.incomeSavingsReserved,0.01);assert.equal(small.purchases[0].savingsAllocated,0.01);
 for(const rate of [-1,101,NaN,Infinity])assert.throws(()=>recordTransaction(initial,income,rate));
});

test('legacy savings stay unchanged and the income method is explicit',()=>{
 const old=recordTransaction(initial,income);
 assert.equal(old.incomeSavingsReserved,150);assert.equal(old.purchases[0].savingsAllocated,undefined);
 assert.equal(calculateSavingsReserved(1000,150,null),150);
 assert.equal(calculateSavingsReserved(1000,null,10),100);
 assert.deepEqual(savingsSetting('income','10'),{savingsAmount:null,savingsPercentage:null,savingsIncomePercentage:10});
 for(const value of ['', '-1', '101', 'NaN'])assert.ok(savingsError('income',value));
 assert.equal(savingsError('income','0'),'');
});
