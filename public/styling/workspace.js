import {foldProductSearch} from '../product-brand.js';
import {catalogImageFrameAttributes} from '../catalog-image-framing.js?v=motif20261126';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const states={ready:'På lager',assigned:'Lagt til på oppdrag',out:'Ute på styling',check:'Venter på kontroll',held:'Holdt tilbake'};
const compare=new Intl.Collator('nb',{numeric:true,sensitivity:'base'}).compare;
const unique=values=>[...new Set(values.filter(Boolean))].sort(compare);
const text=value=>String(value||'').toLocaleLowerCase('nb').trim();
const dayFormat=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'});
const fmt=t=>new Date(Number(t)).toLocaleString('nb-NO',{timeZone:'Europe/Oslo',dateStyle:'short',timeStyle:'short'});
const options=(entries,value)=>entries.map(([key,label])=>'<option value="'+esc(key)+'" '+(key===value?'selected':'')+'>'+esc(label)+'</option>').join('');
const field=(label,key,input)=>'<label>'+esc(label)+input.replace('FIELD','data-field="'+key+'"')+'</label>';
const select=(label,key,entries,value)=>field(label,key,'<select FIELD>'+options(entries,value)+'</select>');
const input=(label,key,value,type)=>field(label,key,'<input FIELD type="'+type+'" value="'+esc(value)+'">');
const picks=(all,values)=>[['',all],...values.map(v=>[v,v])];
export const defaults={term:'',category:'',sub:'',avail:'',state:'',sort:'name',view:'cards'};
export const jobDefaults={term:'',stylist:'',from:'',to:'',sort:'new'};
export function stockRows(data){
  const products=new Map(data.products.map(p=>[p.id,{...p,items:[],available:0}]));
  for(const i of data.items){
    if(!products.has(i.product))products.set(i.product,{id:i.product,name:i.name,stock:null,items:[],available:0});
    const p=products.get(i.product);p.items.push(i);if(i.state==='ready')p.available++;
  }
  return [...products.values()];
}
export function filtered(rows,f){
  return rows.filter(p=>(!f.category||p.category===f.category)&&(!f.sub||p.subcategory===f.sub)
    &&(!f.avail||(f.avail==='yes'?p.available>0:p.available===0))
    &&(!f.state||p.items.some(i=>i.state===f.state))
    &&(foldProductSearch([p.name,p.brand].join(' ')).includes(foldProductSearch(f.term))||p.items.some(i=>text(i.id).includes(text(f.term)))))
    .sort((a,b)=>(f.sort==='available'?b.available-a.available:f.sort==='category'?compare(a.category||'',b.category||''):0)||compare(a.name,b.name));
}
export function stockControls(rows,f,b){
  const categories=unique(rows.map(p=>p.category));
  const subs=unique(rows.filter(p=>!f.category||p.category===f.category).map(p=>p.subcategory));
  return '<div class="filters">'+input('Produktnavn eller etikett-ID','term',f.term,'search')
    +select('Kategori','category',picks('Alle kategorier',categories),f.category)
    +select('Underkategori','sub',picks('Alle underkategorier',subs),f.sub)
    +select('Tilgjengelighet','avail',[['','Alle'],['yes','Minst ett ledig'],['no','Ingen ledige']],f.avail)
    +select('Lagerstatus','state',[['','Alle statuser'],...Object.entries(states)],f.state)
    +select('Sorter etter','sort',[['name','Produktnavn'],['category','Kategori'],['available','Flest tilgjengelige']],f.sort)
    +b('Nullstill filtre','reset-filters')+'</div>';
}
export const photo=p=>p?.image?'<img class="product-photo" src="'+esc(p.image)+'" alt="" loading="lazy">':'';
const tilePhoto=p=>{
 const frame=catalogImageFrameAttributes(p);
 return frame?'<span class="stock-photo-frame"><img class="product-photo" '+frame+' src="'+esc(p.image)+'" alt="" loading="lazy"></span>':photo(p);
};
export function stockResults(rows,f,b){
  const hits=filtered(rows,f);
  return '<div class="list-heading"><h2>Produkter <span class="count">'+hits.length+'</span></h2><div class="switch">'+['cards','list'].map((v,i)=>b(i?'Liste':'Kort','view',v,f.view===v).replace('type="button"','type="button" aria-pressed="'+(f.view===v)+'"')).join('')+'</div></div>'
    +'<div class="products '+(f.view==='cards'?'tiles':'compact')+'">'+hits.map(p=>'<button type="button" class="product" data-action="product" data-value="'+esc(p.id)+'">'+(f.view==='cards'?tilePhoto(p):photo(p))+'<span class="identity"><small>'+esc([p.category,p.subcategory].filter(Boolean).join(' · '))+'</small><strong>'+esc(p.name)+'</strong></span><span class="availability">'+p.available+' ledige av '+p.items.length+' registrerte</span></button>').join('')+'</div>'+(!hits.length?'<p>Ingen produkter passer filtrene.</p>':'');
}
export function jobControls(jobs,f,b){
  return '<div class="filters jobs">'+input('Søk etter adresse','term',f.term,'search')
    +select('Stylist','stylist',picks('Alle stylister',unique(jobs.map(j=>j.stylist))),f.stylist)
    +input('Opprettet fra','from',f.from,'date')+input('Opprettet til','to',f.to,'date')
    +select('Sorter etter','sort',[['new','Nyest først'],['old','Eldst først'],['address','Adresse']],f.sort)
    +b('Nullstill filtre','reset-filters')+'</div>';
}
export function jobResults(jobs,f,b){
  const hits=jobs.filter(j=>{
    const day=dayFormat.format(new Date(Number(j.created)));
    return text(j.address).includes(text(f.term))&&(!f.stylist||j.stylist===f.stylist)&&(!f.from||day>=f.from)&&(!f.to||day<=f.to);
  }).sort((a,b)=>f.sort==='address'?compare(a.address,b.address):f.sort==='old'?a.created-b.created:b.created-a.created);
  return '<div class="list-heading"><h2>Oppdrag <span class="count">'+hits.length+'</span></h2></div>'+hits.map(j=>'<section class="record job-record"><div><h2>'+esc(j.address)+'</h2><p>'+esc(j.stylist)+'</p><p>Opprettet '+esc(fmt(j.created))+' · '+(j.closed?'Avsluttet':'Åpent')+'</p></div>'+b('Åpne oppdrag','job',j.id)+'</section>').join('')+(!hits.length?'<p>Ingen oppdrag å vise.</p>':'');
}
