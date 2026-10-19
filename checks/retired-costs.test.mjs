import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {removeRetiredCosts} from '../server/catalog.mjs';
import {createMysqlStore} from '../server/store.mjs';

test('Retired cost cleanup preserves references, rates, relations and inventory and is idempotent',()=>{
 const products=[{id:'chair',acquisitionCost:649,purchaseUnitPrice:1749,stock:4,price:130},
  {id:'hidden',active:false,acquisitionCost:123},
  {id:'trashed',deletedAt:'2026-10-19T00:00:00.000Z',acquisitionCost:456},
  {id:'package',components:[{id:'chair',quantity:2}],purchasePrice:3498}];
 const before=structuredClone(products),cleaned=removeRetiredCosts(products);
 assert.ok(cleaned.every(p=>!Object.hasOwn(p,'acquisitionCost')));
 assert.equal(cleaned[0].purchaseUnitPrice,1749);assert.equal(cleaned[0].stock,4);
 assert.deepEqual(cleaned[3],products[3]);assert.deepEqual(products,before);
 assert.deepEqual(removeRetiredCosts(cleaned),cleaned);
});

test('Database startup physically removes retired fields under a row lock and advances revision only once',async()=>{
 const original=mysql.createPool;let rows=[{id:'chair',acquisitionCost:649,purchaseUnitPrice:1749},{id:'trash',deletedAt:'2026-10-19T00:00:00Z',acquisitionCost:null}];
 let revision=7,updates=0,commits=0,releases=0;const calls=[];
 const connection={async beginTransaction(){calls.push('begin');},async execute(sql,args){calls.push(sql);
  if(sql.startsWith('SELECT body'))return [[{body:JSON.stringify(rows)}]];
  if(sql.startsWith('UPDATE ku_catalog')){rows=JSON.parse(args[0]);revision++;updates++;return [{}];}
  throw Error('Unexpected query');},async commit(){commits++;},async rollback(){throw Error('Unexpected rollback');},release(){releases++;}};
 const pool={async query(){},async execute(sql){if(sql.startsWith('INSERT IGNORE'))return [{}];if(sql.startsWith('SELECT revision,body'))return [[{revision,body:JSON.stringify(rows)}]];throw Error('Unexpected pool query');},async getConnection(){return connection;},async end(){}};
 mysql.createPool=()=>pool;
 try{
  const env={DB_HOST:'mock',DB_USER:'mock',DB_NAME:'mock',DB_PASSWORD:'mock'};
  const first=createMysqlStore(env,{products:[],revision:1});await first.init();
  assert.ok(calls.includes('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE'));
  assert.ok(rows.every(p=>!Object.hasOwn(p,'acquisitionCost')));assert.equal(rows[0].purchaseUnitPrice,1749);
  assert.equal((await first.readCatalog()).revision,8);await first.close();
  const second=createMysqlStore(env,{products:[],revision:1});await second.init();await second.close();
  assert.equal(updates,1);assert.equal(revision,8);assert.equal(commits,2);assert.equal(releases,2);
 }finally{mysql.createPool=original;}
});
