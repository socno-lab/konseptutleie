import {moduleCardImage} from './module-card-image.js?v=sofaframes20261025';
import {ratePlan} from './catalog-model.js?v=longrent20261026';

// A cover is an exact, known arrangement, not a price for its first module.
// New admin photos must have their pictured contents checked before being priced.
const picturedSofas={
 '/assets/beige-sofa-tre-moduler.webp':{obj_371e3a52807c452ea1280dafd434b7e4:2,obj_d9314111959a42bf8b7ca3015af09003:1},
 '/media/73c49cd2b92a987fb22ae340307580c7':{obj_4e31c6c5bcca4f91abad27609806ac0f:1},
 '/media/3993f06aed296378b567af4be29bbba1':{obj_7cd158cfb2cf4e51b9f6644ba0544082:1,obj_834d73bb940f495b81853eaf5f7f5a39:1},
 '/media/544e49c37f1d4bb8c9db5363ad67cb90':{obj_dbf1ef0037c54e0caa4962d4e20a99da:1,obj_053c65ceffb2449ebfd703abe8536a3c:1},
 '/assets/lagoon-connected-v1.webp':{obj_broste_lagoon_31000586:1,obj_broste_lagoon_31000583:1,obj_broste_lagoon_31000585:1},
 '/media/09e34b3bdfc2dd14a2fd1f0915d4bc2c':{obj_ikea_stockholm2025_base_brun:1,obj_ikea_stockholm2025_midt_brun:1},
 '/media/9ed8bbde97fa7549978a7df6bdbbae45':{obj_jysk_skibby_base_sand:1,obj_jysk_skibby_midt_sand:1}
};

export function sofaCardConfiguration(modules,days=null){
 if(!Array.isArray(modules)||!modules.length||modules.some(p=>p.category==='Utemøbler'))return null;
 const cover=moduleCardImage(modules);
 if(!Object.hasOwn(picturedSofas,cover))return null;
 const selection={...picturedSofas[cover]},components=Object.entries(selection).map(([id,quantity])=>({id,quantity}));
 const lines=components.map(({id,quantity})=>({product:modules.find(p=>p.id===id),quantity}));
 if(lines.some(({product:p})=>!p||!p.active||p.deletedAt||p.rentalEnabled===false||p.isPackage||p.isService||!p.moduleSeries)||new Set(lines.map(({product:p})=>p.moduleSeries)).size!==1)return null;
 const at=duration=>{
  let cents=0;
  for(const {product,quantity} of lines){
   const plan=product.priceOnRequest?null:ratePlan(product,duration,modules);
   if(!plan||!Number.isFinite(plan.total)||plan.total<0)return null;
   cents+=Math.round(plan.total*100)*quantity;
  }
  return cents/100;
 };
 const amounts=[at(1),at(7),at(30)],priceOnRequest=amounts.some(value=>value===null);
 const widthKnown=lines.every(({product:p})=>Number.isFinite(p.moduleWidth)&&p.moduleWidth>0);
 return {
  selection,components,stylingContinuation:lines.every(({product:p})=>p.stylingContinuation),isPackage:true,rentalPricingMode:'components',
  count:lines.reduce((total,{product:p,quantity})=>total+quantity*(p.moduleRole==='base'?2:1),0),
  widthKnown,width:widthKnown?Math.round(lines.reduce((total,{product:p,quantity})=>total+p.moduleWidth*quantity,0)*10)/10:0,
  price:priceOnRequest?null:amounts[0],weekPrice:priceOnRequest?null:amounts[1],monthPrice:priceOnRequest?null:amounts[2],
  selectedTotal:!priceOnRequest&&Number.isInteger(days)&&days>0?at(days):null,priceOnRequest
 };
}
