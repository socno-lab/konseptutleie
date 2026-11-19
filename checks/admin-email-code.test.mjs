import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../app-server.mjs';
import {digest,hashPassword} from '../server/auth.mjs';
import {reserveChallenge,verifyChallenge,adminStamp,adminCookie,adminCodeRecipient} from '../server/admin-email-code.mjs';
import {adminCodeStore} from '../server/admin-code-store.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
import {adminMailFixture} from './helpers/admin-login.mjs';

async function fixture(t,overrides={}){
 const store=await memoryStore(),mail=adminMailFixture(store),credentials={email:'admin@example.invalid',password:'synthetic-password-only-for-testing'};
 await store.createAdmin(credentials.email,await hashPassword(credentials.password));
 const origin='http://admin.example.invalid',server=createServer({store,origin,secureCookies:false,...mail.options,...overrides});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',source=origin)=>fetch(base+path,{method:'POST',headers:{origin:source,'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 return {store,mail,credentials,base,post,async begin(){const r=await post('/api/admin/login',credentials);assert.equal(r.status,200,await r.clone().text());return {r,cookie:r.headers.get('set-cookie').split(';')[0],code:mail.code()};}};
}

test('Password only creates browser-bound challenge; correct email code is single-use under concurrent verification',async t=>{
 const f=await fixture(t),before=await f.store.readCatalog();
 assert.equal((await f.post('/api/admin/login',{...f.credentials,password:'wrong'})).status,401);assert.equal(f.mail.messages.length,0);
 const {r,cookie,code}=await f.begin();assert.deepEqual(await r.json(),{ok:true,codeRequired:true,expiresIn:600});
 assert.match(r.headers.get('set-cookie'),/^konsept_login=.*HttpOnly; SameSite=Strict; Max-Age=600$/);
 assert.equal(f.mail.messages[0].to,adminCodeRecipient);assert.match(code,/^\d{6}$/);
 assert.equal((await fetch(f.base+'/api/admin/catalog',{headers:{cookie}})).status,401);
 assert.equal((await f.post('/api/admin/login/verify',{code})).status,401);
 assert.equal((await f.post('/api/admin/login/verify',{code},'konsept_login='+'a'.repeat(43))).status,401);
 assert.equal((await f.post('/api/admin/login/verify',{code},cookie,'https://foreign.invalid')).status,403);
 const results=await Promise.all([f.post('/api/admin/login/verify',{code},cookie),f.post('/api/admin/login/verify',{code},cookie)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);
 const success=results.find(r=>r.status===200),session=success.headers.getSetCookie().find(s=>s.startsWith('konsept_session_mfa='));
 assert.match(session,/HttpOnly; SameSite=Strict; Max-Age=28800/);assert.match(success.headers.getSetCookie()[1],/Max-Age=0/);
 assert.equal((await fetch(f.base+'/api/admin/catalog',{headers:{cookie:session.split(';')[0]}})).status,200);
 assert.equal((await fetch(f.base+'/api/admin/catalog',{headers:{cookie:session.split(';')[0].replace('konsept_session_mfa=','konsept_session=')}})).status,401);
 assert.equal((await f.post('/api/admin/login/verify',{code},cookie)).status,401);
 assert.deepEqual(await f.store.readCatalog(),before);
 assert.match(adminCookie('__Host-konsept_login','token',true,600),/Path=\/; HttpOnly; SameSite=Strict; Max-Age=600; Secure$/);
});

test('Five wrong codes lock the challenge; resend waits a minute, replaces old challenge and is capped per hour',async t=>{
 let now=Date.now();t.mock.method(Date,'now',()=>now);const f=await fixture(t),first=await f.begin();
 const wrong=first.code==='000000'?'000001':'000000';
 for(let i=0;i<5;i++)assert.equal((await f.post('/api/admin/login/verify',{code:wrong},first.cookie)).status,401);
 assert.equal((await f.post('/api/admin/login/verify',{code:first.code},first.cookie)).status,401);
 assert.equal((await f.post('/api/admin/login',f.credentials)).status,429);assert.equal(f.mail.messages.length,1);
 now+=60001;const next=await f.begin();assert.notEqual(first.cookie,next.cookie);
 assert.equal((await f.post('/api/admin/login/verify',{code:first.code},first.cookie)).status,401);
 assert.equal((await f.post('/api/admin/login/verify',{code:next.code},next.cookie)).status,200);
 for(let i=0;i<3;i++){now+=60001;await f.begin();}
 now+=60001;assert.equal((await f.post('/api/admin/login',f.credentials)).status,429);assert.equal(f.mail.messages.length,5);
 now+=3600000;const expired=await f.begin();now+=600000;
 assert.equal((await f.post('/api/admin/login/verify',{code:expired.code},expired.cookie)).status,401);
});

test('Pending code fails after administrator password changes',async t=>{
 const f=await fixture(t),pending=await f.begin(),hash=digest('existing-mfa-session');await f.store.addSession(hash,Date.now()+60000);
 assert.equal(await f.store.changePassword(hash,await hashPassword('another-synthetic-password')),true);
 assert.equal((await f.post('/api/admin/login/verify',{code:pending.code},pending.cookie)).status,401);
});

test('Missing SMTP and rejected mail fail closed without issuing session or disclosing SMTP secrets',async t=>{
 const disabled=await fixture(t,{env:{}}),noMail=await disabled.post('/api/admin/login',disabled.credentials);
 assert.equal(noMail.status,503);assert.equal(noMail.headers.get('set-cookie'),null);assert.equal(disabled.mail.messages.length,0);
 const rejected=await fixture(t,{sendAdminMail:async()=>{throw Error('SMTP synthetic-secret detail');}}),failure=await rejected.post('/api/admin/login',rejected.credentials);
 assert.equal(failure.status,503);assert.equal(failure.headers.get('set-cookie'),null);assert.doesNotMatch(await failure.text(),/synthetic-secret/);
 assert.equal((await fetch(rejected.base+'/api/admin/catalog')).status,401);
});

test('Challenge state boundaries reject expiration, credential mismatch and exhausted attempts',()=>{
 const user={email:'admin@example.invalid',passwordHash:'hash'},record={tokenHash:'tokenhash',codeHash:'codehash',adminHash:adminStamp(user)},start=100000;
 const row=reserveChallenge(null,record,start);assert.equal(row.expiresAt,start+600000);
 for(const [token,code,stamp,time] of [['other','codehash',record.adminHash,start],['tokenhash','codehash','different',start],['tokenhash','codehash',record.adminHash,start+600000]])assert.equal(verifyChallenge({...row},token,code,stamp,time),false);
 assert.equal(verifyChallenge({...row,attempts:5},record.tokenHash,record.codeHash,record.adminHash,start),false);
 const good={...row};assert.equal(verifyChallenge(good,record.tokenHash,record.codeHash,record.adminHash,start),true);assert.equal(verifyChallenge(good,record.tokenHash,record.codeHash,record.adminHash,start),false);
});

test('SQL verification serializes consumption with password changes and commits session atomically',async()=>{
 const user={email:'admin@example.invalid',passwordHash:'hash'},record={tokenHash:'tokenhash',codeHash:'codehash',adminHash:adminStamp(user)},row=reserveChallenge(null,record,1000),events=[];
 let failInsert=false;
 const db={async beginTransaction(){events.push('begin');},async execute(sql,args){events.push(sql);if(sql.startsWith('SELECT email'))return [[user]];if(sql.startsWith('SELECT token_hash AS tokenHash'))return [[{...row}]];if(sql.startsWith('INSERT INTO ku_admin_mfa_sessions')&&failInsert)throw Error('DB insert failed');return [{affectedRows:1}];},async commit(){events.push('commit');},async rollback(){events.push('rollback');},release(){events.push('release');}};
 const store=adminCodeStore(async()=>{}, {getConnection:async()=>db});
 assert.equal(await store.consumeAdminCode(record.tokenHash,record.codeHash,'sessionhash',1001),true);
 assert.match(events[1],/ku_admin WHERE id=1 FOR UPDATE/);assert.match(events[2],/ku_admin_email_code WHERE id=1 FOR UPDATE/);
 assert.ok(events.findIndex(s=>s.startsWith('UPDATE ku_admin_email_code'))<events.findIndex(s=>s.startsWith('INSERT INTO ku_admin_mfa_sessions')));
 assert.deepEqual(events.slice(-2),['commit','release']);
 events.length=0;failInsert=true;await assert.rejects(store.consumeAdminCode(record.tokenHash,record.codeHash,'sessionhash',1001));assert.deepEqual(events.slice(-2),['rollback','release']);assert.equal(events.includes('commit'),false);
});
