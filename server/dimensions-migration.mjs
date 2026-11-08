// One-time, conservative extraction. Unlabelled sizes retain their original order.
const number='\\d+(?:[.,]\\d+)?';
const labelled=new RegExp('^(?:[BDHLØ]\\s*'+number+'\\s*(?:cm)?\\s*(?:[×x]\\s*)?)+cm$','i');
const generic=new RegExp('^(?:'+number+'\\s*[×x]\\s*){1,2}(?:H\\s*)?'+number+'\\s*cm$','i');
const keys={b:'width',d:'depth',h:'height',l:'length','ø':'diameter'};
const seats={sittehøyde:'seatHeight',setehøyde:'seatHeight',sittedybde:'seatDepth',setedybde:'seatDepth',setebredde:'seatWidth'};
export function migrateDimensions(product){
 if(product.dimensionsMigration===1)return product;
 const d={...(product.dimensions||{})},original={material:product.material,description:product.description},other=[];
 const put=(key,value)=>{const n=Number(value.replace(',','.'));if(d[key]!==undefined&&d[key]!==n)return false;d[key]=n;return true;};
 const extract=text=>{
  const t=text.trim();let values=[];
  if(labelled.test(t)){values=[...t.matchAll(new RegExp('([BDHLØ])\\s*('+number+')','gi'))].map(m=>[keys[m[1].toLowerCase()],m[2]]);}
  else {const m=t.match(new RegExp('^(sittehøyde|setehøyde|sittedybde|setedybde|setebredde|høyde|diameter|bredde|dybde|lengde)\\s*:?\\s*('+number+')\\s*cm$','i'));if(m)values=[[seats[m[1].toLowerCase()]||({høyde:'height',diameter:'diameter',bredde:'width',dybde:'depth',lengde:'length'})[m[1].toLowerCase()],m[2]]];}
  if(values.length){if(values.some(([k,v])=>d[k]!==undefined&&d[k]!==Number(v.replace(',','.'))))return false;values.forEach(([k,v])=>put(k,v));return true;}
  const parts=t.split(/\s*·\s*|,\s+(?=[a-zæøå])|\s+og\s+/i);
  if(parts.length>1){const before={...d},count=other.length;if(parts.every(extract))return true;for(const key of Object.keys(d))delete d[key];Object.assign(d,before);other.length=count;}
  if(generic.test(t)||new RegExp('^'+number+'\\s*cm$').test(t)){other.push(t);return true;}return false;
 };
 const material=(product.material||'').split(/\s*·\s*/).filter(part=>{
  if(extract(part))return false;
  // Preserve qualifiers (per chair, inner pot, bed surface, approximate depth) verbatim.
  if(/\d\s*cm\b/.test(part)&&/^(?:[\dBDHLØ]|innerpotte|Liggemål|Svarte ben|dybde med støtte)/i.test(part.trim())){other.push(part.trim());return false;}
  return true;
 }).join(' · ');
 let description=product.description||'';
 if(!product.isPackage&&!product.addonOnly){
  description=description.replace(/(^|(?<=[.!?])\s+)(.*?)([.!?](?=\s|$)|$)/gs,(all,space,sentence,end)=>{
   const plain=sentence.trim().replace(/^Mål\s*:?\s*/i,'');
   return extract(plain)?'':all;
  }).trim();
 }
 if(other.length)d.other=[d.other,...new Set(other)].filter(Boolean).join(' · ');
 return {...product,dimensions:d,dimensionsMigration:1,...(material!==product.material||description!==product.description?{dimensionsLegacy:original}:{}),material,description};
}
export const migrateCatalogDimensions=products=>products.map(migrateDimensions);
