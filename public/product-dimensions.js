export const dimensionFields=[['width','Bredde'],['depth','Dybde'],['height','Høyde'],['length','Lengde'],['diameter','Diameter'],['seatHeight','Sittehøyde'],['seatDepth','Setedybde'],['seatWidth','Setebredde']];
export function validateDimensions(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ugyldige mål.');
 const result={};
 for(const [key,label] of dimensionFields){const n=value[key];if(n===undefined||n===null||n==='')continue;if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>10000)throw Error(label+' må være et positivt tall i cm (maks 10 000).');result[key]=n;}
 if(value.other!==undefined){if(typeof value.other!=='string'||value.other.length>500)throw Error('Øvrige mål kan ha maks 500 tegn.');if(value.other.trim())result.other=value.other.trim();}
 return result;
}
export function dimensionsMarkup(product){
 const d=product.dimensions||{},esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=dimensionFields.filter(([key])=>Number.isFinite(d[key])&&d[key]>0).map(([key,label])=>'<div><dt>'+label+'</dt><dd>'+new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(d[key])+' cm</dd></div>');
 if(d.other)rows.push('<div class="product-dimension-other"><dt>Øvrige mål</dt><dd>'+esc(d.other)+'</dd></div>');
 return rows.length?'<section class="product-dimensions" aria-label="Mål"><h2>'+(product.moduleSeries?'Mål på denne modulen':'Mål')+'</h2><dl>'+rows.join('')+'</dl></section>':'';
}
export function dimensionSearchText(p){const d=p.dimensions||{};return dimensionFields.filter(([key])=>d[key]).map(([key,label])=>label+' '+d[key]+' cm').concat(d.other||'').join(' ');}
