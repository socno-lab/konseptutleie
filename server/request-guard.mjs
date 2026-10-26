// Bound anonymous work before any database access. Use the socket peer, never
// user-supplied forwarding headers. Persistent Google budgets apply separately.
export function createRequestGuard({now=Date.now,maxClients=2000,maxActive=24,maxClientActive=12}={}){
 const clients=new Map();let windowStart=now(),globalCount=0,inFlight=0;
 return function enter(client){
  const time=now();if(time-windowStart>=60000){windowStart=time;globalCount=0;}
  if(globalCount>=600||inFlight>=maxActive)return null;
  let bucket=clients.get(client);
  if(!bucket||time-bucket.start>=60000){
   if(clients.size>=maxClients)for(const [key,value] of clients)if(time-value.start>=60000)clients.delete(key);
   if(!bucket&&clients.size>=maxClients)return null;
   bucket={start:time,count:0,active:0};clients.set(client,bucket);
  }
  if(bucket.count>=120||bucket.active>=maxClientActive)return null;
  globalCount++;bucket.count++;bucket.active++;inFlight++;
  let released=false;return ()=>{if(released)return;released=true;bucket.active--;inFlight--;};
 };
}
export const contentPolicy="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' https: data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
