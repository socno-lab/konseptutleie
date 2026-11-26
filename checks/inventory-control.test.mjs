import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {stylingSchema,stylingStore} from '../server/styling-store.mjs';
import {transitionTable,countingReport} from '../public/styling/inventory-control.js';

test('scanning a count observes without moving; retirement is confirmed once and cannot be restored as a spare label',async()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  for(const s of stylingSchema.filter(s=>/CREATE TABLE IF NOT EXISTS ku_(styling|stock)_/.test(s)))sql.exec(s.replace('BIGINT AUTO_INCREMENT PRIMARY KEY','INTEGER PRIMARY KEY').replace(/, INDEX\(\w+\)/g,''));
  sql.exec('CREATE TABLE ku_catalog(id INTEGER PRIMARY KEY,body TEXT,revision INTEGER,updated_at TEXT)');
  const p={id:'chair',name:'Stol',category:'Stoler',stock:4},table={id:'table',category:'Bord',name:'Bord',stock:1};
  sql.prepare('INSERT INTO ku_catalog VALUES(1,?,1,NULL)').run(JSON.stringify([p,table]));
  const execute=(statement,values=[])=>{
   const q=sql.prepare(statement.replace(' FOR UPDATE','').replace('INSERT IGNORE','INSERT OR IGNORE').replace('NOW(3)','CURRENT_TIMESTAMP'));
   if(statement.startsWith('SELECT'))return [q.all(...values)];
   return [{affectedRows:q.run(...values).changes}];
  };
  const db={execute,beginTransaction:()=>sql.exec('BEGIN'),commit:()=>sql.exec('COMMIT'),rollback:()=>sql.exec('ROLLBACK'),release(){}};
  const store=stylingStore(async()=>{},{getConnection:()=>db},execute);
  const {ids}=await store.stylingRegister(p,4,'admin');
  const other=(await store.stylingRegister(table,1,'admin')).ids[0];
  for(const id of ids.slice(0,3))await store.stylingMove({id,action:'ready',revision:1},'admin');
  const job=await store.stylingJob('Testadresse','stylist');
  await store.stylingMove({id:ids[2],action:'scan',revision:2,job:job.id},'stylist');
  const {id}=await store.countStart('Stoler','admin');
  const before=await store.stylingOverview();
  assert.deepEqual(new Set((await store.countDetails(id)).expected),new Set(ids.slice(0,2)));
  assert.equal((await store.countRecord(id,ids[0])).already,false);
  assert.equal((await store.countRecord(id,ids[0])).already,true);
  await assert.rejects(store.countRecord(id,other),/tilhører/);
  await store.countRecord(id,ids[3]);
  await store.countClose(id);
  await assert.rejects(store.countRecord(id,ids[1]),/avsluttet/);
  const details=await store.countDetails(id);
  assert.equal(details.seen.length,2);assert.deepEqual(await store.stylingOverview(),before);
  const report=countingReport(details,before.items,()=> '');
  assert.match(report,/1 av 2/);assert.match(report,/Ikke observert · 1/);assert.match(report,/utenfor forventet beholdning · 1/);
  const retire={id:ids[0],reason:'sold',revision:2};
  await store.retireUnit(retire,'admin');
  assert.equal(JSON.parse(sql.prepare('SELECT body FROM ku_catalog').get().body)[0].stock,3);
  await assert.rejects(store.retireUnit(retire,'admin'),/endret/);
  assert.equal((await store.stylingHistory(ids[0]))[0].state,'sold');
  await assert.rejects(store.stylingCorrectUnused(p.id,1,1,true,'admin'),/endret/);
  await assert.rejects(store.stylingMove({id:ids[0],action:'ready',revision:3},'admin'),/lagerstatus/);
  sql.prepare('INSERT INTO ku_styling_catalog_stock(product) VALUES(?)').run(p.id);
  await store.retireUnit({id:ids[2],revision:3,reason:'lost'},'admin');
  assert.equal((await store.stylingJobReturns(job.id)).units[0].movement,'lost');
  const legacy=JSON.parse(sql.prepare('SELECT body FROM ku_catalog').get().body)[0];
  assert.equal(legacy.stock,3);
  const html=transitionTable([p],before.items,{});
  assert.match(html,/Manuell/);assert.match(html,/<td>3<\/td><td>1<\/td>/);
 }finally{sql.close();}
});
