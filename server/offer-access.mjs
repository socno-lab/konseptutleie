import {createHash,randomBytes} from 'node:crypto';

export const day=86400000;
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export const offerLink=token=>'https://konseptuell.no/aksepter-tilbud.html#token='+token;
export async function saveOfferAccess(db,orderId,offerId,kind,expires,hash){
 await db.execute('REPLACE INTO ku_offer_access(order_id,offer_id,kind,expires,token_hash) VALUES (?,?,?,?,?)',[orderId,offerId,kind,expires,hash]);
}
export async function issueOfferAccess(db,orderId,offerId,kind,expires){
 const token=randomBytes(32).toString('base64url');
 await saveOfferAccess(db,orderId,offerId,kind,expires,tokenHash(token));
 return token;
}
export async function migrateOfferAccess(db){
 const [marker]=await db.execute('INSERT IGNORE INTO ku_catalog_migrations(name) VALUES (?)',['offer-access-20261126']);
 if(!marker.affectedRows)return;
 const [records]=await db.execute('SELECT id,body FROM ku_workflow FOR UPDATE');
 for(const row of records){
  const order=JSON.parse(row.body),access=order.offerAcceptance;
  if(access?.hash&&access.offerId&&Number.isFinite(access.expiresAt))await saveOfferAccess(db,row.id,access.offerId,'reply',access.expiresAt+16*day,access.hash);
  let changed=false;
  for(const entry of order.history||[]){
   if(entry.document?.acceptUrl){delete entry.document.acceptUrl;changed=true;}
  }
  if(changed)await db.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(order),row.id]);
 }
 const [messages]=await db.execute("SELECT e.id,e.body,m.status FROM ku_enquiries e LEFT JOIN ku_enquiry_mail m ON m.submission_id=e.id AND m.channel='customer' WHERE e.body LIKE '%acceptUrl%' FOR UPDATE");
 for(const message of messages){
  const snapshot=JSON.parse(message.body);
  if(!snapshot.acceptUrl)continue;
  const token=new URL(snapshot.acceptUrl).searchParams.get('token');
  if(token&&/^[\w-]{43}$/.test(token)&&['pending','failed','uncertain','sending'].includes(message.status))await db.execute('INSERT INTO ku_offer_mail_secret(message_id,token) VALUES (?,?)',[message.id,token]);
  delete snapshot.acceptUrl;
  await db.execute('UPDATE ku_enquiries SET body=? WHERE id=?',[JSON.stringify(snapshot),message.id]);
 }
}
