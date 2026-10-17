import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export const digest=value=>createHash('sha256').update(String(value)).digest('hex');
export const secretEqual=(a,b)=>timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt$32768$${salt}$${hash.toString('hex')}`;}
export async function verifyPassword(password,encoded){const [format,cost,salt,hash]=(encoded||'').split('$');if(format!=='scrypt'||cost!=='32768'||!salt||!hash)return false;const key=await derive(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});const expected=Buffer.from(hash,'hex');return expected.length===key.length&&timingSafeEqual(key,expected);}
export function sessionToken(req,name){const cookie=req.headers.cookie||'';return cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';}
export async function issueSession(store,name,secure){const token=randomBytes(32).toString('base64url');await store.addSession(digest(token),Date.now()+8*60*60*1000);return `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure?'; Secure':''}`;}
export function expiredCookie(name,secure){return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure?'; Secure':''}`;}
