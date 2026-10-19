// Explicit groups prevent unrelated products with similar names from being combined.
const existingVariants=new Map([
 ['Konsollbord med hylle, beige',['Konsollbord med hylle','Beige']],
 ['Konsollbord med hylle, hvitt',['Konsollbord med hylle','Hvit']],
 ['Hübsch Rocco puff, oker',['Hübsch Rocco puff','Oker']],
 ['Hübsch Rocco puff, lys grønn',['Hübsch Rocco puff','Lys grønn']]
]);
export function variantFields(p){const defaults=existingVariants.get(p.name)||['',''];return {variantGroup:p.variantGroup??defaults[0],variantLabel:p.variantLabel??defaults[1]};}
export function productVariants(p,products){const group=variantFields(p).variantGroup;if(!group||p.isPackage||p.addonOnly||p.moduleSeries||p.wallGroup)return [];return products.filter(x=>x.active&&!x.deletedAt&&!x.isPackage&&!x.addonOnly&&!x.moduleSeries&&!x.wallGroup&&x.category===p.category&&variantFields(x).variantGroup===group).sort((a,b)=>variantFields(a).variantLabel.localeCompare(variantFields(b).variantLabel,'nb'));}
