import sharp from 'sharp';
const supported=new Set(['image/png','image/jpeg','image/webp','image/avif']);
const busy=()=>Object.assign(Error('Bildet er opptatt. Prøv igjen om litt.'),{status:503});
const resize=image=>sharp(image.body,{limitInputPixels:40000000}).rotate().resize({width:image.width,height:image.width,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85,mozjpeg:false}).timeout({seconds:4}).toBuffer();
// The loader runs only on a miss and inside a bounded worker. A cold thumbnail
// never falls back to a large original when conversion capacity is occupied.
export function createCatalogThumbnailer({maxBytes=16*1024*1024,maxEntries=128,maxConcurrent=2,maxQueued=12,maxWaitMs=6000,transform=resize}={}){
 const cache=new Map(),pending=new Map(),queue=[];let bytes=0,active=0,generation=0;
 function remember(key,body){
  if(body.length>maxBytes)return;
  while(cache.size&&(bytes+body.length>maxBytes||cache.size>=maxEntries)){const first=cache.keys().next().value;bytes-=cache.get(first).length;cache.delete(first);}
  cache.set(key,body);bytes+=body.length;
 }
 function start(task){
  clearTimeout(task.timer);active++;
  (async()=>{
   const image=await task.load();if(!image||!supported.has(image.mime))return null;
   const body=await transform({...image,width:task.width});
   if(task.generation===generation)remember(task.key,body);
   return body;
  })().then(task.resolve,task.reject).finally(()=>{active--;if(pending.get(task.key)===task.promise)pending.delete(task.key);if(queue.length)start(queue.shift());});
 }
 function get(id,width,load){
  if(![320,640,1280].includes(width))return Promise.resolve(null);
  const key=id+':'+width;
  if(cache.has(key)){const body=cache.get(key);cache.delete(key);cache.set(key,body);return Promise.resolve(body);}
  if(pending.has(key))return pending.get(key);
  if(active>=maxConcurrent&&queue.length>=maxQueued)return Promise.reject(busy());
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const task={key,width,load,resolve,reject,promise,generation};pending.set(key,promise);
  if(active<maxConcurrent)start(task);
  else {queue.push(task);task.timer=setTimeout(()=>{const at=queue.indexOf(task);if(at<0)return;queue.splice(at,1);if(pending.get(key)===promise)pending.delete(key);reject(busy());},maxWaitMs);}
  return promise;
 }
 // Media IDs are immutable; clearing on purge/restore/upload also prevents an
 // in-flight conversion from restoring a thumbnail to the invalidated cache.
 function clear(){generation++;cache.clear();bytes=0;}
 return {get,clear};
}
const defaultThumbnailer=createCatalogThumbnailer();
export function catalogThumbnail(id,width,image){return defaultThumbnailer.get(id,width,async()=>image);}
