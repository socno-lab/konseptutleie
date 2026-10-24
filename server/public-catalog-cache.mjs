// One short-lived public projection per server process. Authentication and all
// customer, submission, discount and admin reads stay outside this cache.
export function createPublicCatalogCache(read,project,{ttlMs=1000,maxBytes=4*1024*1024,now=Date.now}={}){
 let current=null,pending=null,generation=0;
 async function get(){
  if(current&&current.expires>now())return current.data;
  if(pending)return pending;
  const version=generation;
  const job=(async()=>{
   const source=await read();
   const data=project({revision:source.revision,updatedAt:source.updatedAt,products:source.products,settings:source.settings});
   // A concurrent admin save must not repopulate the cache with the prior read.
   if(version!==generation)return get();
   if(Buffer.byteLength(JSON.stringify(data))<=maxBytes)current={data,expires:now()+ttlMs};
   return data;
  })();
  pending=job;
  try{return await job;}finally{if(pending===job)pending=null;}
 }
 function invalidate(){generation++;current=null;pending=null;}
 return {get,invalidate};
}
