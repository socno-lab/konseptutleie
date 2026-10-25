// A textile/decor set keeps its own purchase value, independent of its rental tariff.
const defaults={obj_textile_loungestol_30days:600,obj_1cd92777d68c44ddbc1fe0f9dc72b032:1200,obj_4768bc953cba43da88eb565feb753892:900,obj_eaa2e64c15ce45cd8b3177f58f75b3ea:900};
const price=value=>typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;
export function addonBuyoutPrice(p){return p?Object.hasOwn(p,'buyoutUnitPrice')?price(p.buyoutUnitPrice):defaults[p.id]??null:null;}
export function isBuyoutAddon(p){return !!p&&(p.addonOnly||p.rentalPricingMode==='period')&&p.category!=='Styling'&&p.offeringType!=='service';}
