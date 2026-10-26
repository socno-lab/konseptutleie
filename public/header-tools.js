import {buildHeaderCatalog,searchHeaderCatalog,searchHeaderCategories,cleanFavoriteIds} from './header-catalog-model.js?v=headersearch20261026c';
import {configureSiteSettings,imageUrl} from './site-settings.js';

const header=document.querySelector('body>header.has-header-tools'),layer=document.querySelector('.header-tools-layer');
if(header&&layer)mount();
function mount(){
 const key='konsept-favorites-v1',panel=layer.querySelector('#headerToolsPanel'),title=panel.querySelector('h2'),form=panel.querySelector('form'),input=panel.querySelector('input'),status=panel.querySelector('.header-tools-status'),results=panel.querySelector('.header-tools-results'),current=panel.querySelector('.header-tools-current'),notice=panel.querySelector('.header-tools-storage'),browse=panel.querySelector('.header-tools-browse'),buttons=[...header.querySelectorAll('[data-header-tool]')];
 const heart=buttons.find(b=>b.dataset.headerTool==='favorites').querySelector('svg').outerHTML;
 let mode='search',entries=null,loading=null,favorites=[],persistent=true,previousInert=[],returnFocus=null,debounce,visibleResults=8;
 function read(){if(!persistent)return favorites;try{return cleanFavoriteIds(JSON.parse(localStorage.getItem(key)||'[]'));}catch{persistent=false;return favorites;}}
 favorites=read();
 function updateCount(){const b=buttons.find(b=>b.dataset.headerTool==='favorites'),count=b.querySelector('.header-favorites-count');count.textContent=String(favorites.length);count.hidden=!favorites.length;b.setAttribute('aria-label','Favoritter'+(favorites.length?' – '+favorites.length:''));}
 function storageNote(){notice.hidden=mode!=='favorites';notice.textContent=persistent?'Favorittene lagres i denne nettleseren. Fjern dem med hjertet.':'Nettleseren tillater ikke lagring. Favorittene beholdes bare til siden lastes på nytt.';}
 function close(focus=true){
  if(layer.hidden)return;layer.hidden=true;buttons.forEach(b=>b.setAttribute('aria-expanded','false'));for(const [el,inert] of previousInert)el.inert=inert;previousInert=[];document.body.classList.remove('header-tools-open');if(focus)returnFocus?.focus({preventScroll:true});
 }
 function position(){document.documentElement.style.setProperty('--header-tools-top',header.getBoundingClientRect().bottom+'px');}
 async function open(next){
  document.dispatchEvent(new CustomEvent('header-tools-opening'));
  if(layer.hidden){returnFocus=document.activeElement;previousInert=[...document.body.children].filter(el=>el!==header&&el!==layer&&!['SCRIPT','STYLE','DIALOG'].includes(el.tagName)).map(el=>[el,el.inert]);for(const [el] of previousInert)el.inert=true;document.body.classList.add('header-tools-open');}
  mode=next;visibleResults=8;layer.hidden=false;position();buttons.forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.headerTool===mode)));title.textContent=mode==='search'?'Søk':'Favoritter';form.hidden=mode!=='search';browse.hidden=true;favorites=read();updateCount();storageNote();current.replaceChildren();results.replaceChildren();
  if(mode==='search')input.focus({preventScroll:true});else panel.focus({preventScroll:true});
  if(entries){render();return;}status.textContent='Laster utvalget …';
  try{if(!loading)loading=fetch('/api/catalog',{signal:AbortSignal.timeout(12000)}).then(async response=>{if(!response.ok)throw Error('catalog');const data=await response.json();if(!Array.isArray(data.products))throw Error('catalog');configureSiteSettings(data.settings);entries=buildHeaderCatalog(data.products);}).finally(()=>{loading=null;});await loading;if(!layer.hidden)render();}
  catch{if(layer.hidden)return;status.textContent='Utvalget kunne ikke lastes. ';const retry=document.createElement('button');retry.type='button';retry.className='header-tools-browse';retry.textContent='Prøv igjen';retry.onclick=()=>open(mode);status.append(retry);}
 }
 function rentalHref(href){const url=new URL(href,location.origin);let scope=new URL(location.href).searchParams.get('prisbruk');try{scope=localStorage.getItem('konsept-rental-scope-v1')||scope;}catch{}if(['standard','messe'].includes(scope))url.searchParams.set('prisbruk',scope);return url.pathname+url.search+url.hash;}
 function toggle(id){
  favorites=read();const selected=favorites.includes(id);if(!selected&&favorites.length>=100){status.textContent='Du kan lagre inntil 100 favoritter. Fjern en før du legger til flere.';return;}
  favorites=selected?favorites.filter(x=>x!==id):[...favorites,id];try{localStorage.setItem(key,JSON.stringify(favorites));persistent=true;}catch{persistent=false;}updateCount();storageNote();
  if(mode==='favorites'){render();panel.focus({preventScroll:true});}else{for(const b of results.querySelectorAll('[data-favorite]'))setFavoriteState(b,b.dataset.favorite);status.textContent=selected?'Fjernet fra favoritter.':'Lagret som favoritt.';}
 }
 function setFavoriteState(button,id){const saved=favorites.includes(id);button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',(saved?'Fjern fra favoritter: ':'Lagre som favoritt: ')+(entries.find(e=>e.id===id)?.title||''));}
 function row(entry){
  const item=document.createElement('div');item.className='header-result';
  const img=document.createElement('img');img.className='header-result-image';img.alt='';img.width=64;img.height=64;img.loading='lazy';if(entry.image&&imageUrl(entry.image))img.src=entry.image;else img.hidden=true;img.addEventListener('error',()=>{img.removeAttribute('src');img.hidden=true;},{once:true});
  const copy=document.createElement('div'),name=document.createElement('p');name.className='header-result-title';name.textContent=entry.title;copy.append(name);
  const kind=document.createElement('p');kind.className='header-result-kind';kind.textContent=entry.category==='Pakker'?'Pakker og tjenester':entry.category;copy.append(kind);
  const links=document.createElement('div');links.className='header-result-links';for(const [label,href] of [['Se for leie',entry.rentHref],['Se for kjøp',entry.buyHref]])if(href){const a=document.createElement('a');a.textContent=label;a.href=label==='Se for leie'?rentalHref(href):href;links.append(a);}copy.append(links);
  const favorite=document.createElement('button');favorite.type='button';favorite.className='header-favorite-toggle';favorite.dataset.favorite=entry.id;favorite.innerHTML=heart;setFavoriteState(favorite,entry.id);favorite.onclick=()=>toggle(entry.id);
  item.append(img,copy,favorite);return item;
 }
 function categoryRow(entry){
  const item=document.createElement('div');item.className='header-category-result';
  const name=document.createElement('p');name.className='header-result-title';name.textContent=entry.title;item.append(name);
  const links=document.createElement('div');links.className='header-result-links';
  for(const [label,href,mode] of [['Se alle til leie',entry.rentHref,'rent'],['Se alle til kjøp',entry.buyHref,'buy']])if(href){const a=document.createElement('a');a.textContent=label;a.setAttribute('aria-label',label+': '+entry.title);a.href=mode==='rent'?rentalHref(href):href;links.append(a);}
  item.append(links);return item;
 }
 function render(){
  if(!entries)return;results.replaceChildren();current.replaceChildren();
  if(mode==='search'){
   const query=input.value.trim(),found=searchHeaderCatalog(entries,query,100),categories=searchHeaderCategories(entries,query);
   status.textContent=!query?'Søk etter produkt, merke eller kategori.':found.length?found.length+' produkttreff'+(found.length>visibleResults?' – viser '+visibleResults+'.':'.'):categories.length?'Se hele kategorien nedenfor.':'Ingen treff. Prøv et annet søkeord.';
   if(categories.length){const label=document.createElement('p');label.textContent=categories.length===1?'Kategori':'Kategorier';current.append(label,...categories.map(categoryRow));}
   for(const entry of found.slice(0,visibleResults))results.append(row(entry));
   browse.hidden=found.length<=visibleResults;browse.textContent='Vis flere treff';
  }else{
   browse.hidden=false;browse.textContent='Finn flere favoritter';
   const selected=entries.find(e=>e.productIds.includes(new URL(location.href).searchParams.get('produkt')));
   if(selected&&!favorites.includes(selected.id)){const text=document.createElement('p');text.textContent='Produktet du ser på';current.append(text,row(selected));}
   const found=favorites.map(id=>entries.find(e=>e.id===id)).filter(Boolean);if(found.length<favorites.length){const remove=document.createElement('button');remove.type='button';remove.className='header-tools-browse';remove.textContent='Fjern favoritter som ikke lenger er i utvalget';remove.onclick=()=>{favorites=found.map(e=>e.id);try{localStorage.setItem(key,JSON.stringify(favorites));}catch{persistent=false;}updateCount();render();};current.append(remove);}status.textContent=found.length?found.length+(found.length===1?' favoritt':' favoritter')+(found.length<favorites.length?' tilgjengelig i utvalget nå.':'.'):'Du har ingen tilgjengelige favoritter ennå. Lagre produkter med hjertet i søkeresultatene eller fra produktsiden.';for(const entry of found)results.append(row(entry));
  }
 }
 buttons.forEach(b=>b.addEventListener('click',()=>!layer.hidden&&mode===b.dataset.headerTool?close():open(b.dataset.headerTool)));
 layer.querySelector('.header-tools-outside').addEventListener('click',()=>close());panel.querySelector('.header-tools-close').addEventListener('click',()=>close());browse.addEventListener('click',()=>{if(mode==='favorites')open('search');else{visibleResults+=8;render();}});
 form.addEventListener('submit',e=>{e.preventDefault();visibleResults=8;render();});input.addEventListener('input',()=>{clearTimeout(debounce);visibleResults=8;debounce=setTimeout(render,120);});
 header.addEventListener('click',e=>{if(!layer.hidden&&!e.target.closest('[data-header-tool]')&&e.target.closest('a,button'))close(false);},true);
 document.addEventListener('keydown',e=>{if(layer.hidden)return;if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Tab'){const nodes=[...header.querySelectorAll('a,button'),...panel.querySelectorAll('a,button,input')].filter(el=>!el.disabled&&!el.inert&&el.getClientRects().length),index=nodes.indexOf(document.activeElement);if(e.shiftKey&&index<=0){e.preventDefault();nodes.at(-1)?.focus();}else if(!e.shiftKey&&(index<0||index===nodes.length-1)){e.preventDefault();nodes[0]?.focus();}}});
 window.addEventListener('resize',position);window.addEventListener('pagehide',()=>close(false));window.addEventListener('storage',e=>{if(e.key===key||e.key===null){favorites=read();updateCount();if(!layer.hidden)render();}});updateCount();
}
