import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {day,migrateOfferAccess,tokenHash} from '../server/offer-access.mjs';

test('legacy links retain their bounded lifetime and only undelivered customer mail retains a secret',async()=>{
 const token=randomBytes(32).toString('base64url'),acceptUrl='https://konseptuell.no/aksepter-tilbud.html?token='+token;
 const access={offerId:'offer',hash:tokenHash(token),expiresAt:123456};
 const order={offerAcceptance:access,history:[{document:{acceptUrl}}]};
 const writes=[];
 const db={async execute(sql,params){
  if(sql.startsWith('INSERT IGNORE'))return [{affectedRows:1}];
  if(sql.startsWith('SELECT id,body'))return [[{id:'order',body:JSON.stringify(order)}]];
  if(sql.startsWith('SELECT e.id'))return [['sent','pending','failed','uncertain','sending','cancelled'].map(status=>({id:status,status,body:JSON.stringify({acceptUrl})}))];
  writes.push({sql,params});return [{}];
 }};
 await migrateOfferAccess(db);
 assert.deepEqual(writes.find(w=>w.sql.startsWith('REPLACE')).params,['order','offer','reply',access.expiresAt+16*day,access.hash]);
 assert.deepEqual(writes.filter(w=>w.sql.startsWith('INSERT INTO ku_offer_mail_secret')).map(w=>w.params[0]),['pending','failed','uncertain','sending']);
 const cleaned=writes.filter(w=>w.sql.startsWith('UPDATE'));
 assert.equal(cleaned.length,7);assert.ok(cleaned.every(w=>!w.params[0].includes(token)));
});
