// One frontal reference per series gives touching modules the same viewpoint.
// Generated assets are illustrations; original supplier photos stay in the gallery.
const outdoor={
 obj_c274f2d322614de4be80c2b891a78174:{original:'/assets/venture-home-lounge-front.webp',source:'/assets/copacabana-beige-connected-v1.png',size:[2172,724],cuts:[31,735,1439,2145],top:24,bottom:690},
 obj_ad4086d4e89041529b6c6563f220b046:{original:'/assets/venture-home-lounge-hvit-front.webp',source:'/assets/copacabana-brown-connected-v1.png',size:[2164,727],cuts:[54,751,1404,2103],top:42,bottom:665}
};
const kid={
 obj_7cd158cfb2cf4e51b9f6644ba0544082:{original:'/media/e7e28a4539ea9d1a3da014e8d385130e',family:'isa',role:'left'},
 obj_834d73bb940f495b81853eaf5f7f5a39:{original:'/media/e95963ce8cfd07380f5a36fe9b736e17',family:'isa',role:'right'},
 obj_18a7f0aad41741e6a7dd860bc4cd9bca:{original:'/media/15a398cc2b02b86428f05f8df740561a',family:'isa',role:'middle'},
 obj_e96a0e321c9f4fff8740247d00166d0a:{original:'/media/13b472d7600de7893d16dc8d70fa3ba8',family:'isa',role:'chaise'},
 obj_dbf1ef0037c54e0caa4962d4e20a99da:{original:'/media/a885295b8a5807a4470e500f12163a88',family:'juno',role:'left'},
 obj_053c65ceffb2449ebfd703abe8536a3c:{original:'/media/081f837f836045da7d37131b6feb0755',family:'juno',role:'right'},
 obj_56ba54bbfc4f4a16a31aed4acf134364:{original:'/media/6d05052432518e521573c4635fbc980b',family:'juno',role:'middle'}
};
const scenes={
 isa:{source:'/assets/kid-isa-connected-v1.png',size:[2172,724],left:[81,145,736,570],middle:[736,145,1314,570],chaise:[1314,145,2089,620]},
 juno:{source:'/assets/kid-juno-connected-v1.png',size:[2172,724],left:[72,174,788,590],middle:[788,174,1380,590],right:[1380,174,2100,590]}
};
// Lagoon's legacy per-module crops have different camera angles. Use a single
// frontal illustration only while those exact catalogue choices are unchanged.
const lagoonSource='/assets/lagoon-connected-v1.webp';
const lagoon={
 obj_broste_lagoon_31000586:{original:'/media/2d89f4d3e04bee99eb0fb51ce70aa5a1',role:'left',legacyCrop:[34.1818,57.1818,67.2727,85.6364],mirror:true,crop:[100,150,791,606]},
 obj_broste_lagoon_31000583:{original:'/media/109f838631f83ccdbb127d431059f178',role:'middle',legacyCrop:[34.4545,57.1818,66.0909,86.0909],mirror:false,crop:[791,150,1380,606]},
 obj_broste_lagoon_31000585:{original:'/media/157718c9ee5369b6f6c52d42612e7337',role:'right',legacyCrop:[32.6364,57.1818,65.8182,85.6364],mirror:true,crop:[1380,150,2072,606]}
};
function lagoonMatch(p){const entry=lagoon[p?.id];return !!entry&&p.moduleSeries==='Broste Copenhagen Lagoon, lys blå'&&p.moduleRole===entry.role&&p.image===entry.original&&(!p.builderImage||p.builderImage===entry.original&&JSON.stringify(p.builderCrop)===JSON.stringify(entry.legacyCrop)&&!!p.builderMirror===entry.mirror);}
export function joinedModuleCover(modules){return modules.length===3&&new Set(modules.map(p=>p.id)).size===3&&modules.every(lagoonMatch)?lagoonSource:'';}
export function joinedPhotoParts(parts){
 if(parts.length>1&&parts.every(p=>lagoonMatch(p.product))){
  parts.forEach(p=>{p.photo={source:lagoonSource,size:[2172,724],crop:lagoon[p.product.id].crop,mirror:false,height:70,replaceBuilder:true};});return true;
 }

 const first=parts[0]?.product,setting=outdoor[first?.id];
 if(setting&&parts.every(p=>p.product.id===first.id&&p.product.image===setting.original)){
  parts.forEach((p,i)=>{const slot=i===0?0:i===parts.length-1?2:1;p.photo={source:setting.source,size:setting.size,crop:[setting.cuts[slot],setting.top,setting.cuts[slot+1],setting.bottom],height:65};});return true;
 }
 const entries=parts.map(p=>kid[p.product.id]),family=entries[0]?.family;
 if(!family||!parts.every((p,i)=>entries[i]?.family===family&&entries[i].original===p.product.image))return false;
 parts.forEach((p,i)=>{const scene=scenes[family],role=entries[i].role,mirror=family==='isa'&&role==='right',crop=scene[role]||scene.left;p.photo={source:scene.source,size:scene.size,crop,mirror,top:10,height:role==='chaise'?73*(crop[3]-crop[1])/(scene.left[3]-scene.left[1]):73,tall:role==='chaise'};});return true;
}
