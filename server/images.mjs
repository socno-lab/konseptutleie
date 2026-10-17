import {imageSize} from 'image-size';
import {readdir,stat} from 'node:fs/promises';
import path from 'node:path';
function sniff(bytes){
 if(bytes.length<12)return null;
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'image/webp';
 if(bytes.toString('ascii',4,8)==='ftyp'&&/avif|avis/.test(bytes.toString('ascii',8,32)))return 'image/avif';
 return null;
}
export async function staticImages(publicRoot){const assets=path.join(publicRoot,'assets'),names=await readdir(assets);return Promise.all(names.filter(n=>/\.(png|jpe?g|webp|avif)$/i.test(n)).map(async name=>({name,url:'/assets/'+encodeURIComponent(name),bytes:(await stat(path.join(assets,name))).size,source:'asset'})));}
export function mediaUsage(image,products){return products.filter(p=>[p.image,p.wallCover,...(p.gallery||[])].includes(image.url)).map(p=>({id:p.id,name:p.name,deletedAt:p.deletedAt||'',active:p.active}));}

export function imageMime(bytes){const mime=sniff(bytes);if(!mime)return null;try{const {width,height}=imageSize(bytes);if(!width||!height||width>20000||height>20000||width*height>80000000)return null;return mime;}catch{return null;}}
