const test=require('node:test');
const assert=require('node:assert/strict');
const {readIncomeSavings}=require('../dist/lib/income-savings');
const mock=(data,error=null)=>({from(table){assert.equal(table,'plans');return {select(fields){assert.equal(fields,'savings_income_percentage, income_savings_reserved, savings_income_amount');return {eq(field,user){assert.equal(field,'user_id');assert.equal(user,'user');return {maybeSingle:async()=>({data,error})}}}}}}});
test('missing migration disables only the new feature, not legacy plan access',async()=>{
 const result=await readIncomeSavings(mock(null,{code:'42703',message:'column plans.savings_income_percentage does not exist'}),'user');
 assert.equal(result.supported,false);assert.equal(result.error,null);assert.equal(result.reserved,0);
});
test('new schema supports empty accounts and preserves numeric database values',async()=>{
 assert.equal((await readIncomeSavings(mock(null),'user')).supported,true);
 const result=await readIncomeSavings(mock({savings_income_percentage:'12.5',income_savings_reserved:'200.25'}),'user');
 assert.equal(result.supported,true);assert.equal(result.percentage,12.5);assert.equal(result.reserved,200.25);
});
test('permission and unrelated schema errors are not hidden by migration fallback',async()=>{
 for(const error of [{code:'42501',message:'permission denied'},{code:'42703',message:'column plans.balance does not exist'}]) {
  assert.equal((await readIncomeSavings(mock(null,error),'user')).error,error);
 }
});
