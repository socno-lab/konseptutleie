// Apply small sources only to raster thumbnails. SVG module compositions keep their original coordinate system.
export function enquiryThumbnails(markup,enabled){
 if(!enabled)return markup;
 return markup.replace(/(<img\b[^>]*? src=")([^"]+)(")/g,(original,start,src,end)=>{
  const media=/^\/media\/[a-f0-9]{32}$/.test(src);
  const asset=/^\/assets\/([\w.-]+\.(?:jpe?g|png|webp|avif))$/i.exec(src);
  if(!media&&!asset)return original;
  const variant=width=>media?src+'?thumb='+width:'/cart-image/'+width+'/'+asset[1];
  return start+src+end+' srcset="'+variant(320)+' 320w, '+variant(640)+' 640w" sizes="(max-width:640px) 64px, 94px"';
 });
}
