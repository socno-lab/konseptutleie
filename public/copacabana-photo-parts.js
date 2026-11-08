// Supplier front views: tight viewports connect seats, with arms on the outside.
const profiles={
 obj_4c3c94fd87ad42a8809fd76ce2a48fbb:{name:'end-brown',crop:[372,149,839,672],side:'right',original:'/media/35c6829dce7c534cea26802a7a059312'},
 obj_ad4086d4e89041529b6c6563f220b046:{name:'middle-brown',crop:[358,124,850,700],original:'/assets/venture-home-lounge-hvit-front.webp'},
 obj_7e1c0dfb719a4b00811cebcb77c7585a:{name:'end-beige',crop:[372,177,822,685],side:'left',original:'/media/8db68f8ca3162cf69c7a5f555ae4ea1a'},
 obj_c274f2d322614de4be80c2b891a78174:{name:'middle-beige',crop:[380,184,811,687],original:'/assets/venture-home-lounge-front.webp'}
};
export function copacabanaPhotoParts(parts){
 if(!parts.length||!parts.every(p=>{const f=profiles[p.product.id];return f&&(p.product.builderImage||p.product.image)===f.original;}))return false;
 for(const [index,p] of parts.entries()){
  const f=profiles[p.product.id],crop=[...f.crop],mirror=!!f.side&&p.role!==f.side;
  // Remove the recessed cushion margins only at joins; keep outside silhouettes intact.
  if(index>0)crop[mirror?2:0]+=mirror?-28:28;
  if(index<parts.length-1)crop[mirror?0:2]+=mirror?28:-28;
  const frame=profiles[f.name.includes('brown')?'obj_4c3c94fd87ad42a8809fd76ce2a48fbb':'obj_7e1c0dfb719a4b00811cebcb77c7585a'];
  p.photo={frame:!f.side&&parts.some(part=>profiles[part.product.id].side)?frame:null,source:'/assets/copacabana-'+f.name+'-front.webp',size:[1200,800],crop,lowerCrop:f.crop,mirror,height:65,replaceBuilder:true};}
 return true;
}
