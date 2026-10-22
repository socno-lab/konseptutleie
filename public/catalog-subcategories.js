import {getSiteSettings,subcategoryLabel} from './site-settings.js';
// Shared table types for the rental and new-product catalogues.
export const tableTypes=['Spisebord','Sofabord','Sidebord','Nattbord','Ståbord','Skrivebord','Konsollbord','Andre bord'];
export function tableType(product){
 if(product.category!=='Bord')return '';
 if(tableTypes.includes(product.subcategory))return product.subcategory;
 const name=String(product.name||'').toLocaleLowerCase('nb-NO');
 if(/nattbord|bedside|nightstand/.test(name))return 'Nattbord';
 if(/ståbord|barbord|bar table|verticus/.test(name))return 'Ståbord';
 if(/skrivebord|desk/.test(name))return 'Skrivebord';
 if(/konsollbord|console/.test(name))return 'Konsollbord';
 if(/spisebord|dining table|charlie bord/.test(name))return 'Spisebord';
 if(/sidebord|side table/.test(name))return 'Sidebord';
 if(/sofabord|coffee table|brook table/.test(name))return 'Sofabord';
 if(/miro bord/.test(name))return /49/.test(name)?'Sidebord':'Sofabord';
 return 'Andre bord';
}
export function availableTableTypes(products){const found=new Set(products.filter(p=>!p.deletedAt&&p.active!==false&&!p.addonOnly&&!p.isPackage).map(tableType));return tableTypes.filter(type=>found.has(type));}
export function tableTypeButtons(types,selected){return ['Alle bord',...types].map((label,index)=>{const value=index?label:'';return `<button type="button" data-table-type="${String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}" aria-pressed="${selected===value}">${label}</button>`;}).join('');}

const typeOrder={
 Bord:tableTypes,
 Stoler:['Spisestoler','Loungestoler','Barkrakker','Puffer','Benker','Andre stoler'],
 Sofaer:['Modulsofaer','2-setere','3-setere','4-setere','Hjørnesofaer','Sovesofaer','Andre sofaer'],
 Belysning:['Portable lamper','Bordlamper','Gulvlamper','Taklamper','Vegglamper','Annen belysning'],
 Hyller:['Hyller','Kommoder','Skap','Klesstativer','Konsollbord','Annen oppbevaring'],
 Tepper:['Gulvtepper','Runde tepper','Løpere'],
 'Kunstige planter':['Trær','Grønne planter','Gress'],
 Utemøbler:['Loungemoduler','Utestoler','Utebord','Andre utemøbler']
};
export function subcategoryOptions(category){return getSiteSettings().categories.find(c=>c.id===category)?.subcategories.map(s=>s.id)||[];}
export function validSubcategory(category,value){return value===''||subcategoryOptions(category).includes(value);}
export function productSubcategory(p,category=p.category){
 if(p.category!==category)return '';
 if(p.subcategory&&validSubcategory(category,p.subcategory))return p.subcategory;
 const n=String(p.name||'').toLocaleLowerCase('nb-NO');
 const text=n+' '+String(p.description||'').toLocaleLowerCase('nb-NO');
 if(category==='Bord')return tableType(p);
 if(category==='Stoler'){
  if(/barstol|barkrakk|bar stool|bar chair/.test(n))return 'Barkrakker';
  if(/puff|pouf|ottoman/.test(n))return 'Puffer';
  if(/benk|bench/.test(n))return 'Benker';
  if(/lounge|lenestol|armchair|fåtölj/.test(n))return 'Loungestoler';
  if(/spisestol|dining chair|aspen/.test(n))return 'Spisestoler';
  return 'Andre stoler';
 }
 if(category==='Sofaer'){
  if(p.moduleSeries||/modulsofa/.test(n))return 'Modulsofaer';
  if(/sovesofa|sofa bed/.test(n))return 'Sovesofaer';
  if(/hjørnesofa|corner sofa/.test(n))return 'Hjørnesofaer';
  for(const count of [2,3,4])if(new RegExp(count+'[ -]?(seter|sits|seater)').test(text))return count+'-setere';
  if(/jakobsdals senza sofa/.test(n))return '2-setere';
  return 'Andre sofaer';
 }
 if(category==='Belysning'){
  if(/portabel|portable|oppladbar|bringme/.test(n))return 'Portable lamper';
  if(/gulvlampe|floor lamp/.test(n))return 'Gulvlamper';
  if(/vegglampe|wall lamp/.test(n))return 'Vegglamper';
  if(/taklampe|pendant|ceiling/.test(n))return 'Taklamper';
  if(/bordlampe|table lamp/.test(n))return 'Bordlamper';
  return 'Annen belysning';
 }
 if(category==='Hyller'){
  if(/konsollbord|console/.test(n))return 'Konsollbord';
  if(/klesstativ|clothing rack/.test(n))return 'Klesstativer';
  if(/kommode|dresser|sideboard/.test(n))return 'Kommoder';
  if(/skap|wardrobe|cabinet/.test(n))return 'Skap';
  if(/hylle|shelf|shelv/.test(n))return 'Hyller';
  return 'Annen oppbevaring';
 }
 if(category==='Tepper'){
  if(/ø\s*\d|rund|round/.test(n+' '+(p.material||'').toLowerCase()))return 'Runde tepper';
  if(/løper|runner|smalt|70\s*[×x]\s*(140|200|240)/.test(n))return 'Løpere';
  return 'Gulvtepper';
 }
 if(category==='Kunstige planter'){
  if(/gress|grass|pampas/.test(n))return 'Gress';
  if(/tre|fikus|ficus/.test(n))return 'Trær';
  return 'Grønne planter';
 }
 if(category==='Utemøbler'){
  if(p.moduleSeries||/modul/.test(n))return 'Loungemoduler';
  if(/bord|table/.test(n))return 'Utebord';
  if(/stol|chair/.test(n))return 'Utestoler';
  return 'Andre utemøbler';
 }
 return '';
}
export function availableSubcategories(products,category){
 const found=new Set(products.filter(p=>p.active!==false&&!p.deletedAt&&!p.addonOnly&&!p.isPackage).map(p=>productSubcategory(p,category)));
 return subcategoryOptions(category).filter(type=>found.has(type));
}
export function subcategoryButtons(types,selected,category){
 const all={Bord:'Alle bord',Stoler:'Alle stoler',Sofaer:'Alle sofaer',Belysning:'All belysning',Hyller:'All oppbevaring',Tepper:'Alle tepper','Kunstige planter':'Alle planter',Utemøbler:'Alle utemøbler'}[category]||'Alle';
 return [all,...types].map((label,index)=>{const value=index?label:'';return `<button type="button" data-table-type="${String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}" aria-pressed="${selected===value}">${subcategoryLabel(category,label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</button>`;}).join('');
}
