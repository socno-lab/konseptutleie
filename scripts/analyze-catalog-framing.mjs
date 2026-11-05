// Read-only analysis of a saved public catalogue; writes candidates to work/, never publishes.
// Review source backgrounds and candidate extents visually before updating catalog-image-bounds.js.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
await fs.mkdir('work/framing-images',{recursive:true});
const catalog=JSON.parse(await fs.readFile('work/catalog-framing.json'));
const products=catalog.products.filter(p=>p.active!==false&&!p.deletedAt&&!p.isPackage&&!p.isService&&p.image);
const sources=[...new Set(products.map(p=>p.image))],result={},review=[];
let next=0;
await Promise.all(Array.from({length:5},async()=>{while(next<sources.length){const src=sources[next++],file='work/framing-images/'+crypto.createHash('sha1').update(src).digest('hex');try{
 let body;try{body=await fs.readFile(file);}catch{if(src.startsWith('/assets/'))body=await fs.readFile('public'+src);else {const res=await fetch(new URL(src,'https://konseptuell.no'),{signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error(res.status);body=Buffer.from(await res.arrayBuffer());}await fs.writeFile(file,body);}
 const {data,info}=await sharp(body).rotate().flatten({background:'#fff'}).resize(400,400,{fit:'inside'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h,channels:c}=info;const pix=(x,y)=>Array.from(data.subarray((y*w+x)*c,(y*w+x)*c+3));
 const edges=[];for(let x=0;x<w;x++){edges.push(pix(x,0),pix(x,h-1));}for(let y=0;y<h;y++)edges.push(pix(0,y),pix(w-1,y));
 const bg=[0,1,2].map(i=>edges.map(v=>v[i]).sort((a,b)=>a-b)[Math.floor(edges.length/2)]);
 const distance=p=>Math.max(...p.map((v,i)=>Math.abs(v-bg[i])));
 const uniform=edges.filter(p=>distance(p)<16).length/edges.length;
 if(Math.min(...bg)<225||uniform<.985&&!['/assets/lounge-beige-natur-front.webp','/assets/spisestol-eik-papirsnor-vinkel.webp','/assets/spisestol-mork-eik-vinkel.webp','/assets/konsollbord-beige-produkt.webp'].includes(src)){review.push({src,reason:'scene/background',uniform,bg});continue;}
 let l=w,t=h,r=0,b=0,count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(distance(pix(x,y))>28){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);count++;}
 if(count<w*h*.01||r-l<12||b-t<12){review.push({src,reason:'empty'});continue;}
 // Retain a conservative halo for pale edges, antialiasing and soft shadows.
 l=Math.max(0,l-4);t=Math.max(0,t-4);r=Math.min(w,r+5);b=Math.min(h,b+5);
 result[src]=[w,h,l,t,r,b];
 }catch(e){review.push({src,reason:String(e)});}}}));
await fs.writeFile('work/framing-bounds.json',JSON.stringify(result,null,2));await fs.writeFile('work/framing-review.json',JSON.stringify(review,null,2));console.log({sources:sources.length,profiles:Object.keys(result).length,excluded:review.length});
