import sharp from 'sharp';
// Catalog thumbnails have two fixed sizes. Original media remains unchanged.
const cache=new Map(),pending=new Map();let bytes=0,active=0;
const limit=16*1024*1024;
export async function catalogThumbnail(id,width,image){
 if(![320,640].includes(width)||!image||!['image/png','image/jpeg','image/webp','image/avif'].includes(image.mime))return null;
 const key=id+':'+width;
 if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
 if(pending.has(key))return pending.get(key);
 if(active>=2)return null; // Fall back to the original under load, rather than queue unbounded work.
 active++;
 const job=(async()=>{try{
  const body=await sharp(image.body,{limitInputPixels:40000000}).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85,mozjpeg:false}).timeout({seconds:4}).toBuffer();
  if(body.length<=limit){while(cache.size&&(bytes+body.length>limit||cache.size>=128)){const oldest=cache.keys().next().value;bytes-=cache.get(oldest).length;cache.delete(oldest);}cache.set(key,body);bytes+=body.length;}
  return body;
 }catch{return null;}finally{active--;pending.delete(key);}})();pending.set(key,job);return job;
}
