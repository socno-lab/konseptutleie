// Furniture packages inherit optional extras from their actual contents.
// Per-person tableware and made-to-order proposals keep their specialised selectors.
export function inheritsPackageAddons(p,products){return !!p?.isPackage&&!p.isProposal&&!!p.components?.length&&!p.components.every(c=>products.find(x=>x.id===c.id)?.isService===true||products.find(x=>x.id===c.id)?.addonOnly===true);}
export function packageAddonChoices(p,products,selection=null){
 if(!inheritsPackageAddons(p,products))return [];
 const byId=new Map(products.map(x=>[x.id,x])),parts=selection?Object.entries(selection).map(([id,quantity])=>({id,quantity})):p.components,counts=new Map(parts.map(c=>[c.id,c.quantity])),included=new Set(parts.map(c=>c.id)),choices=new Map();
 const coveredRequirements=new Set(parts.map(c=>byId.get(c.id)?.requiredProductId).filter(Boolean));
 for(const c of parts){const main=byId.get(c.id);if(!main||main.deletedAt||!main.active||main.addonOnly||!Number.isInteger(c.quantity)||c.quantity<1)continue;
  for(const id of main.relatedAddOns||[]){const extra=byId.get(id);if(!extra||extra.deletedAt||!extra.active||extra.rentalEnabled===false||extra.isPackage||included.has(id)||extra.requiredProductId&&coveredRequirements.has(extra.requiredProductId))continue;
   let choice=choices.get(id);if(!choice){choice={id,quantity:0,parentIds:[],parentNames:[],series:new Set()};choices.set(id,choice);}if(!choice.parentIds.includes(main.id)){choice.parentIds.push(main.id);choice.parentNames.push(main.name);}
   if(main.moduleSeries&&(/tekstilpakke.*sofa/i.test(extra.name)||extra.placeholderIcon==='pillow')){if(!choice.series.has(main.moduleSeries)){choice.series.add(main.moduleSeries);const modules=parts.filter(c=>byId.get(c.id)?.moduleSeries===main.moduleSeries),bases=modules.filter(c=>byId.get(c.id).moduleRole==='base').reduce((n,c)=>n+c.quantity,0),ends=modules.filter(c=>['left','right','end'].includes(byId.get(c.id).moduleRole)).reduce((n,c)=>n+c.quantity,0);choice.quantity+=Math.max(1,bases+Math.ceil(ends/2));}}
   else if(extra.category==='Styling'&&extra.isService)choice.quantity=1;
   else choice.quantity+=c.quantity;
  }
 }
 return [...choices.values()].map(({series,...c})=>{const extra=byId.get(c.id);return {...c,quantity:Math.min(99,extra.requiredProductId?Math.floor((counts.get(extra.requiredProductId)||0)/(extra.requiredProductQuantity||1)):c.quantity)};}).filter(c=>c.quantity>0);
}
export function withPackageAddons(products){return products.map(p=>inheritsPackageAddons(p,products)?{...p,relatedAddOns:packageAddonChoices(p,products).map(c=>c.id)}:p);}
