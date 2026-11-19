import assert from 'node:assert/strict';
export function adminMailFixture(store){
 const messages=[];
 store.pendingEnquiryMail??=async()=>[];
 const options={env:{SMTP_PASS:'synthetic-test-only'},sendMail:async()=>{throw Error('Unexpected customer mail in admin test');},sendAdminMail:async message=>{messages.push(message);return {accepted:[message.to]};}};
 return {messages,options,code(){return messages.at(-1)?.text.match(/kode.*?: (\d{6})/)?.[1];}};
}
export async function loginAdmin(post,mail,credentials){
 const start=await post('/api/admin/login',credentials);
 assert.equal(start.status,200,await start.clone().text());
 assert.equal((await start.json()).codeRequired,true);
 const pending=start.headers.get('set-cookie').split(';')[0];
 const verified=await post('/api/admin/login/verify',{code:mail.code()},pending);
 assert.equal(verified.status,200,await verified.clone().text());return verified;
}
export async function setupAdmin(post,mail,credentials){
 const setup=await post('/api/admin/setup',credentials);assert.equal(setup.status,200);
 assert.equal(setup.headers.get('set-cookie'),null);
 return loginAdmin(post,mail,credentials);
}
