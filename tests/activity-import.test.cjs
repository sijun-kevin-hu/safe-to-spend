const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
function load(path){const exports={};new Function('exports',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:1}}).outputText)(exports);return exports;}
const {parseCsv,detectMapping,previewCsv,importHistory}=load('src/lib/activity-csv.ts');
const {filterActivity}=load('src/lib/activity-dates.ts');
const {reviseActivity}=load('src/lib/activity.ts');
const {updateTrackingBalance,recordTransaction}=load('src/lib/plan.ts');
const now=new Date(2026,10,15,12),iso=d=>new Date(2026,10,d,12).toISOString();
const seed={balance:100,balanceUpdatedAt:iso(1),purchases:[],incomeSavingsReserved:10};
function preview(text,existing=[],positive=false,dayFirst=false){const table=parseCsv(text);return previewCsv(table,detectMapping(table.headers),existing,positive,dayFirst);}

test('CSV parsing handles BOM, CRLF, commas in quotes, escaped quotes and embedded newlines',()=>{
 const table=parseCsv('\uFEFFDate,Description,Amount\r\n2026-11-01,"Coffee, \"\"large\"\"",-5\r\n2026-11-02,"Two\nlines",10\r\n');
 assert.equal(table.rows[0][1],'Coffee, "large"');assert.equal(table.rows[1][1],'Two\nlines');
 assert.equal(previewCsv(table,detectMapping(table.headers),[]).entries.length,2);
});
test('CSV parsing accepts semicolon and tab files and rejects damaged/oversized input',()=>{
 assert.equal(parseCsv('Date;Amount\n2026-11-01;-5').rows[0][1],'-5');
 assert.equal(parseCsv('Date\tAmount\n2026-11-01\t-5').rows[0][1],'-5');
 for(const text of ['Date,Amount\n"broken,5','Date,Amount\n2026-11-01,5,extra','Date,Amount\n2026-11-01,"5"oops','Date,Amount','x'.repeat(1024*1024+1)])assert.throws(()=>parseCsv(text));
 assert.throws(()=>parseCsv('Date,Amount\n'+('2026-11-01,1\n'.repeat(1001))));
});
test('signed amount and explicit types import purchases and income, with configurable sign convention',()=>{
 const result=preview('Transaction Date,Description,Amount\n11/01/2026,Coffee,-5\n11/02/2026,Pay,100');
 assert.deepEqual(result.errors,[]);assert.equal(result.spent,5);assert.equal(result.received,100);assert.ok(result.entries.every(e=>e.historyOnly));
 assert.equal(preview('Date,Amount\n2026-11-01,5',[],true).entries[0].kind,'purchase');
 const typed=preview('Date,Amount,Type\n2026-11-01,5,purchase\n2026-11-02,10,credit');
 assert.equal(typed.entries[0].kind,'purchase');assert.equal(typed.entries[1].kind,'income');
 assert.equal(preview('Date,Amount,Type\n2026-11-01,5,transfer').errors.length,1);
});
test('separate debit and credit columns work without inventing two transactions from a row',()=>{
 const result=preview('Date,Description,Debit,Credit\n2026-11-01,Coffee,5,\n2026-11-02,Pay,,100');
 assert.deepEqual(result.errors,[]);assert.equal(result.spent,5);assert.equal(result.received,100);
 assert.equal(preview('Date,Debit,Credit\n2026-11-01,5,10').errors.length,1);
});
test('money parsing supports USD thousands and accounting negatives; rejects zero, decimals beyond cents and scientific notation',()=>{
 const result=preview('Date,Amount\n2026-11-01,"$1,234.50"\n2026-11-02,(5.50)');
 assert.equal(result.received,1234.5);assert.equal(result.spent,5.5);
 for(const value of ['0','1.234','1e3','NaN','--5'])assert.equal(preview('Date,Amount\n2026-11-01,'+value).errors.length,1);
});
test('dates are strictly checked; slash format selection resolves ambiguous dates',()=>{
 assert.equal(new Date(preview('Date,Amount\n01/02/2026,-5',[],false,true).entries[0].createdAt).getMonth(),1);
 for(const value of ['2026-02-30','11/31/2026','2099-01-01','Nov 1'])assert.equal(preview('Date,Amount\n'+value+',-5').errors.length,1);
 assert.equal(preview('Date,Description,Amount\n2026-11-01,'+'x'.repeat(121)+',5').errors.length,1);
});
test('reimports skip existing CSV IDs while preserving legitimate identical rows',()=>{
 const text='Date,Description,Amount\n2026-11-01,Coffee,-5\n2026-11-01,Coffee,-5';
 const first=preview(text);assert.equal(first.entries.length,2);assert.notEqual(first.entries[0].id,first.entries[1].id);
 const again=preview(text,first.entries);assert.equal(again.entries.length,0);assert.equal(again.duplicates,2);
 const overlap=preview('Date,Description,Amount\n2026-11-01,Coffee,-5\n2026-11-02,Pay,100',first.entries);
 assert.equal(overlap.duplicates,1);assert.equal(overlap.entries.length,1);
});
test('history import and later correction preserve current balance, snapshots and savings',()=>{
 let state=updateTrackingBalance({...seed,balance:0,balanceUpdatedAt:null},100,iso(1),'start');
 state=recordTransaction(state,{id:'coffee',kind:'purchase',amount:5,createdAt:iso(3)});
 const entries=preview('Date,Amount\n2026-10-01,-20\n2026-11-02,50').entries;
 const imported=importHistory(state,entries);
 assert.equal(imported.balance,95);assert.equal(imported.incomeSavingsReserved,10);
 assert.deepEqual(imported.purchases.slice(0,state.purchases.length),state.purchases);
 assert.equal(importHistory(imported,entries),imported);
 const edited=reviseActivity(imported,entries[0].id,{amount:30,note:'Corrected'});
 assert.equal(edited.balance,95);assert.equal(edited.incomeSavingsReserved,10);
 assert.deepEqual(edited.purchases.find(e=>e.id==='start'),state.purchases.find(e=>e.id==='start'));
 assert.equal(reviseActivity(imported,entries[0].id,null).balance,95);
 assert.equal(reviseActivity(imported,'coffee',{amount:10,note:''}).balance,90);
});
test('invalid import batches fail atomically',()=>{
 const entry=preview('Date,Amount\n2026-11-01,-5').entries[0];
 for(const override of [{historyOnly:false},{amount:0},{balanceBefore:10},{savingsAllocated:2},{createdAt:'invalid'}])assert.throws(()=>importHistory(seed,[{...entry,...override}]));
 assert.throws(()=>importHistory(seed,[entry,entry]));
 assert.equal(seed.purchases.length,0);
});
test('quick date filters use inclusive local days, calendar months and year boundaries',()=>{
 const entries=[1,8,9,15,16].map(day=>({id:String(day),amount:1,createdAt:iso(day)}));
 assert.deepEqual(filterActivity(entries,'week',null,null,now).map(e=>e.id),['15','9']);
 assert.deepEqual(filterActivity(entries,'today',null,null,now).map(e=>e.id),['15']);
 assert.equal(filterActivity(entries,'custom',new Date(2026,10,8),new Date(2026,10,9),now).length,2);
 assert.equal(filterActivity(entries,'custom',new Date(2026,10,9),new Date(2026,10,8),now).length,0);
 assert.equal(filterActivity(entries,'custom',null,null,now).length,0);
 const dec={id:'dec',amount:1,createdAt:new Date(2025,11,31,23,59).toISOString()};
 assert.equal(filterActivity([dec],'lastMonth',null,null,new Date(2026,0,1)).length,1);
 const lastDay={id:'late',amount:1,createdAt:new Date(2026,10,9,23,59,59).toISOString()};
 assert.equal(filterActivity([lastDay],'custom',new Date(2026,10,9),new Date(2026,10,9),now).length,1);
});
