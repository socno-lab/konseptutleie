import {randomBytes,randomInt} from 'node:crypto';
import nodemailer from 'nodemailer';
import {digest,secretEqual} from './auth.mjs';
export const adminCodeRecipient='andreas@konseptboligstyling.no';
export const challengeLifetime=10*60*1000;
export const adminStamp=user=>digest(user.email+'\n'+user.passwordHash);
export function reserveChallenge(previous,record,now){
 const fresh=!previous||now-previous.windowStart>=3600000;
 const count=fresh?0:previous.sends;
 if(previous?.sendAfter>now||count>=5)return null;
 return {...record,attempts:0,expiresAt:now+challengeLifetime,sendAfter:now+60000,windowStart:fresh?now:previous.windowStart,sends:count+1};
}
export function verifyChallenge(row,tokenHash,codeHash,stamp,now){
 if(!row||row.tokenHash!==tokenHash||row.expiresAt<=now||row.attempts>=5||row.adminHash!==stamp)return false;
 row.attempts++;
 if(!secretEqual(row.codeHash,codeHash))return false;
 row.expiresAt=0;return true;
}
export function adminCookie(name,value,secure,maxAge){return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export function createAdminCodeSender(env,store,sendOverride){
 const user=env.SMTP_USER||'post@konseptuell.no',port=Number(env.SMTP_PORT||465);
 const enabled=Boolean(store.enabled&&env.SMTP_PASS&&user==='post@konseptuell.no'&&[465,587].includes(port));
 const transport=enabled&&!sendOverride?nodemailer.createTransport({host:env.SMTP_HOST||'smtp.hostinger.com',port,secure:port===465,requireTLS:true,auth:{user,pass:env.SMTP_PASS},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true}):null;
 const send=sendOverride||(message=>transport.sendMail(message));
 return {enabled,close(){transport?.close();},async notifyPasswordChanged(email){
  if(!enabled)return false;
  try{
   const result=await send({from:{name:'Konseptuell',address:user},to:email,subject:'Administratorpassordet er endret',text:'Passordet til administrasjonen på Konseptuell.no er endret. Kontakt den ansvarlige for nettstedet straks dersom du ikke gjorde dette.',disableFileAccess:true,disableUrlAccess:true});
   return Boolean(result?.accepted?.some(address=>String(address).toLowerCase()===email.toLowerCase()));
  }catch{return false;}
 },async sendStylistInvitation(email,url){
  if(!enabled)return false;
  try{
   const result=await send({
    from:{name:'Konseptuell',address:user},to:email,subject:'Invitasjon til Styling og lager hos Konseptuell',
    text:`Hei!\n\nDu er invitert til Styling og lager hos Konseptuell. Åpne lenken og velg ditt eget passord:\n\n${url}\n\nLenken er personlig, kan brukes én gang og gjelder i 24 timer.\n\nHilsen Konseptuell`,
    disableFileAccess:true,disableUrlAccess:true
   });
   return Boolean(result?.accepted?.some(address=>String(address).toLowerCase()===email));
  }catch{return false;}
 },async begin(admin){
  if(!enabled)throw Object.assign(Error('E-postbekreftelse er utilgjengelig. Prøv igjen senere.'),{status:503});
  const token=randomBytes(32).toString('base64url'),code=String(randomInt(0,1000000)).padStart(6,'0'),now=Date.now();
  const record={tokenHash:digest(token),codeHash:digest(token+':'+code),adminHash:adminStamp(admin)};
  if(!await store.reserveAdminCode(record,now))throw Object.assign(Error('Vent minst ett minutt før du ber om ny kode. Maksimalt fem koder kan sendes per time.'),{status:429});
  try{
   const result=await send({from:{name:'Konseptuell – admin',address:user},to:adminCodeRecipient,subject:'Din innloggingskode til Konseptuell',text:`Innloggingskoden din er: ${code}\n\nKoden gjelder i 10 minutter og kan bare brukes én gang. Skriv den inn på https://konseptuell.no/admin/login i nettleseren hvor du oppga passordet.\n\nIkke del koden med andre. Hvis du ikke forsøkte å logge inn, må du kontrollere administratorpassordet.`,disableFileAccess:true,disableUrlAccess:true});
   if(!result?.accepted?.some(address=>String(address).toLowerCase()===adminCodeRecipient))throw Error('Not accepted');
  }catch{await store.cancelAdminCode(record.tokenHash);throw Object.assign(Error('Koden kunne ikke sendes. Vent ett minutt og prøv innloggingen igjen.'),{status:503});}
  return token;
 }};
}
