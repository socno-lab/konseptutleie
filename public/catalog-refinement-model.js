import {variantFields} from './product-variants.js?v=fest20261114';
import {saleUnitPrice} from './sales-model.js?v=fest20261114';

// Only named colours are searchable. `color`/swatchColor are illustration
// colours and may be shared placeholders, so they must not classify products.
export const catalogColors=[
 ['beige','Beige / sand','beige|sand|sandfarget|cream|krem|kremhvit'],
 ['hvit','Hvit','hvit|hvitt|hvite|white|offwhite|off-white'],
 ['svart','Svart','svart|svartfarget|sort|sorte|black'],
 ['gra','Grå','grå|grått|gråfarget|grey|gray|antrasitt'],
 ['brun','Brun','brun|brunt|brune|brunert|brown|burnished'],
 ['natur','Natur','natur|natural|naturfarget|eikefarget'],
 ['gronn','Grønn','grønn|grønt|grønne|green|olivengrønn'],
 ['bla','Blå','blå|blått|blue|marineblå'],
 ['gul','Gul / oker','gul|gult|yellow|oker|ochre|sennep|mustard'],
 ['oransje','Oransje','oransje|orange|terracotta|terrakotta'],
 ['rod','Rød','rød|rødt|røde|red|burgund|burgundy|vinrød'],
 ['rosa','Rosa','rosa|pink'],
 ['lilla','Lilla','lilla|purple|lavendel'],
 ['gull','Gull / messing','gull|gullfarget|gold|messing|brass'],
 ['solv','Sølv / krom','sølv|sølvfarget|silver|krom|chrome|nikkel|nickel'],
 ['flerfarget','Flerfarget','flerfarget|multifarget|multicolor|multicolour'],
 ['transparent','Transparent','transparent|gjennomsiktig|klart glass|clear glass']
].map(([id,label,words])=>({id,label,pattern:new RegExp('(?:^|[^\\p{L}])(?:'+words+')(?!\\p{L})','iu')}));
const colorIds=new Set(catalogColors.map(c=>c.id));
export function productColors(product){
 const text=[variantFields(product).variantLabel,product.name,product.material,product.moduleSeries].filter(x=>typeof x==='string').join(' ');
 return catalogColors.filter(c=>c.pattern.test(text)).map(c=>c.id);
}
export function matchesColor(product,color){return !color||productColors(product).includes(color);}
export function availableColors(products,selected=''){
 const ids=new Set(products.flatMap(productColors));if(colorIds.has(selected))ids.add(selected);
 return catalogColors.filter(c=>ids.has(c.id)).map(({id,label})=>({id,label}));
}
export function normalizeRefinement(value={}){return {color:colorIds.has(value?.color)?value.color:'',sort:['price-asc','price-desc'].includes(value?.sort)?value.sort:'default',period:['day','week','month'].includes(value?.period)?value.period:'day'};}
export function readRefinement(params){return normalizeRefinement({color:params.get('farge'),sort:params.get('sortering'),period:params.get('periode')});}
export function writeRefinement(params,value,{sale=false}={}){
 const state=normalizeRefinement(value);
 for(const [key,value] of Object.entries({farge:state.color,sortering:state.sort==='default'?'':state.sort,periode:!sale&&state.period!=='day'?state.period:''})){
  if(value)params.set(key,value);else params.delete(key);
 }
 return params;
}
export function rentalComparisonPrice(product,period='day'){
 if(!product||product.priceOnRequest||product.rentalPricingMode==='fixed')return null;
 // A monthly flat rate has no daily/weekly tariff in the catalogue.
 if(product.rentalPricingMode==='period')return period==='month'&&Number.isFinite(product.price)&&product.price>=0?product.price:null;
 const value=period==='week'?product.weekPrice??product.price*5:period==='month'?product.monthPrice??product.price*15:product.price;
 return Number.isFinite(value)&&value>=0?value:null;
}
function stablePriceSort(items,sort,price){
 if(!['price-asc','price-desc'].includes(sort))return items;
 const direction=sort==='price-asc'?1:-1;
 return items.map((item,index)=>({item,index,value:price(item)})).sort((a,b)=>a.value===null?(b.value===null?a.index-b.index:1):b.value===null?-1:direction*(a.value-b.value)||a.index-b.index).map(x=>x.item);
}
export function sortRentalCards(cards,{sort='default',period='day',confirmed=true}={}){
 return confirmed?stablePriceSort(cards,sort,card=>rentalComparisonPrice(Object.hasOwn(card,'comparisonProduct')?card.comparisonProduct:card.product,period)):cards;
}
export function sortSaleProducts(products,{sort='default'}={}){return stablePriceSort(products,sort,saleUnitPrice);}
