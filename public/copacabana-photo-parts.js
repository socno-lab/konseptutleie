// Supplier front views: tight viewports connect seats, with arms on the outside.
const profiles={
 obj_4c3c94fd87ad42a8809fd76ce2a48fbb:{name:'end-brown',crop:[372,149,839,672],side:'right',original:'/media/35c6829dce7c534cea26802a7a059312'},
 obj_ad4086d4e89041529b6c6563f220b046:{name:'middle-brown',crop:[358,124,850,700],original:'/assets/venture-home-lounge-hvit-front.webp'},
 obj_7e1c0dfb719a4b00811cebcb77c7585a:{name:'end-beige',crop:[372,177,822,685],side:'left',original:'/media/8db68f8ca3162cf69c7a5f555ae4ea1a'},
 obj_c274f2d322614de4be80c2b891a78174:{name:'middle-beige',crop:[380,184,811,687],original:'/assets/venture-home-lounge-front.webp'}
};
export function copacabanaPhotoParts(parts){
 if(!parts.length||!parts.every(p=>{const f=profiles[p.product.id];return f&&(p.product.builderImage||p.product.image)===f.original;}))return false;
 for(const p of parts){const f=profiles[p.product.id];p.photo={source:'/assets/copacabana-'+f.name+'-front.webp',size:[1200,800],crop:f.crop,mirror:!!f.side&&p.role!==f.side,height:65,replaceBuilder:true};}
 return true;
}
