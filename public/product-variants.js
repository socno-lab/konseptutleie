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
 return products.map(p=>{if(p.id===current.id)return current;const link=links.find(x=>x.id===p.id);if(link)return {...p,variantGroup:group,variantLabel:link.label.trim()};if(oldGroup&&group===oldGroup&&p.category===current.category&&eligible(p)&&variantFields(p).variantGroup===oldGroup)return {...p,variantGroup:'',variantLabel:''};return p;});
}

// Rental choices include only owned, rentable variants; sold-to-order colours stay in sales.
export function rentalVariants(p,products){return productVariants(p,products).filter(x=>x.rentalEnabled!==false&&x.stock>0);}
export function groupedRentalCards(products){const seen=new Set();return products.filter(p=>{const group=variantFields(p).variantGroup;if(p.category!=='Belysning'||!group||p.stock<=0)return true;const key=p.category+'|'+group;if(seen.has(key))return false;seen.add(key);return true;});}
export function variantColour(p){const label=variantFields(p).variantLabel.toLocaleLowerCase('nb');if(label.includes('burgund'))return '#743848';if(label.includes('matt'))return '#242424';if(label.includes('burnished')||label.includes('brunert'))return '#756342';if(label.includes('nickel')||label.includes('nikkel'))return '#b9bcc0';if(label.includes('sand')||label.includes('beige'))return '#d5c7a7';if(label.includes('green')||label.includes('grønn'))return label.includes('mørk')||label.includes('dark')?'#35483e':'#7c9364';if(label.includes('blue')||label.includes('blå'))return '#a9bfce';if(label.includes('brass')||label.includes('messing'))return '#c2a65e';if(label.includes('brown')||label.includes('brun'))return '#715247';if(label.includes('black')||label.includes('sort'))return '#090909';if(label.includes('hvit')||label.includes('white'))return '#eeece4';if(label.includes('oker')||label.includes('ochre'))return '#b58a39';if(label.includes('natur'))return '#c5a477';return /^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#b5ad99';}
