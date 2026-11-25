// Measure only studio images with a near-white, uniform border.
export async function measureCatalogMotif(body){
 const {default:sharp}=await import('sharp');
 const {data,info:{width:w,height:h,channels:c}}=await sharp(body,{limitInputPixels:40000000})
  .rotate().flatten({background:'#fff'}).toColourspace('srgb')
  .resize(400,400,{fit:'inside',withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
 const whiteDistance=(x,y)=>{
  const i=(y*w+x)*c;
  return 255-Math.min(data[i],data[i+1],data[i+2]);
 };
 let edges=0,white=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(x&&y&&x<w-1&&y<h-1)continue;
  edges++;if(whiteDistance(x,y)<22)white++;
 }
 if(white/edges<.985)return null;
 let l=w,t=h,r=0,b=0,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(whiteDistance(x,y)>32){
  l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);count++;
 }
 if(count<w*h*.01||r-l<12||b-t<12)return null;
 return [w,h,Math.max(0,l-4),Math.max(0,t-4),Math.min(w,r+5),Math.min(h,b+5)];
}
