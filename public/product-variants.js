// Explicit groups prevent unrelated products with similar names from being combined.
const existingVariants=new Map([
 ['Konsollbord med hylle, beige',['Konsollbord med hylle','Beige']],
 ['Konsollbord med hylle, hvitt',['Konsollbord med hylle','Hvit']],
 ['Hübsch Rocco puff, oker',['Hübsch Rocco puff','Oker']],
 ['Hübsch Rocco puff, lys grønn',['Hübsch Rocco puff','Lys grønn']]
]);
export function variantFields(p){const defaults=existingVariants.get(p.name)||['',''];return {variantGroup:p.variantGroup??defaults[0],variantLabel:p.variantLabel??defaults[1]};}
export function productVariants(p,products){const group=variantFields(p).variantGroup;if(!group||p.isPackage||p.addonOnly||p.moduleSeries||p.wallGroup)return [];return products.filter(x=>x.active&&!x.deletedAt&&!x.isPackage&&!x.addonOnly&&!x.moduleSeries&&!x.wallGroup&&x.category===p.category&&variantFields(x).variantGroup===group).sort((a,b)=>variantFields(a).variantLabel.localeCompare(variantFields(b).variantLabel,'nb'));}

export function linkVariantProducts(current,products,links,previous=products.find(p=>p.id===current.id)){
 const eligible=p=>!p.isPackage&&!p.addonOnly&&!p.moduleSeries&&!p.wallGroup&&!p.deletedAt;
 if(!eligible(current))return products;
 const ids=new Set(links.map(x=>x.id));
 if(ids.size!==links.length||ids.has(current.id))throw Error('Ugyldige fargekoblinger.');
 const group=current.variantGroup?.trim()||'';
 if(links.length&&(!group||!current.variantLabel?.trim()))throw Error('Oppgi farge på produktet.');
 for(const link of links){const peer=products.find(p=>p.id===link.id);if(!peer||!eligible(peer)||peer.category!==current.category||!link.label?.trim())throw Error('Fargevariantene trenger navn og samme kategori.');}
 const oldGroup=previous?variantFields(previous).variantGroup:'';
 return products.map(p=>{if(p.id===current.id)return current;const link=links.find(x=>x.id===p.id);if(link)return {...p,variantGroup:group,variantLabel:link.label.trim()};if(oldGroup&&p.category===current.category&&eligible(p)&&variantFields(p).variantGroup===oldGroup)return {...p,variantGroup:'',variantLabel:''};return p;});
}
