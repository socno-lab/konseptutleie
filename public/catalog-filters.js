const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const standardCategories=['Bord','Senger','Sofaer','Stoler','Utemøbler','Servise','Pakker','Bilder','Hyller','Belysning','Tepper','Kunstige planter','Kunstige blomster','Dekor'];
// Use the same admin-controlled order, labels and wrapping before and after loading.
export function catalogFilters(products,settings,selected='Alle',purpose='alle'){
 const categories=[{id:'Alle',label:'Alle'},{id:'Enkeltprodukter',label:'Enkeltprodukter'},...settings.categories.filter(c=>standardCategories.includes(c.id)||products.some(p=>p.category===c.id&&!p.addonOnly&&!p.isService))];
 if(selected==='Modulsofaer')selected='Sofaer';
 if(purpose==='boligsalg'&&selected==='Pakker')selected='Enkeltprodukter';
 if(!categories.some(c=>c.id===selected))selected='Alle';
 return categories.map(c=>'<button type="button" data-filter="'+escape(c.id)+'"'+(selected===c.id?' class="active"':'')+' aria-pressed="'+(selected===c.id)+'"'+(purpose==='boligsalg'&&c.id==='Pakker'?' hidden':'')+'>'+escape(c.label==='Pakker'?'Pakker og tjenester':c.label)+'</button>').join('');
}
