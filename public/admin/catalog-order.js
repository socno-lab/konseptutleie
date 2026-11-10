import {rentalCatalogView} from '/rental-catalog-view.js?v=adminorder20261110';
import {configureSiteSettings,sortProducts} from '/site-settings.js?v=optionimages20261108';
import {purposes} from '/rental-purpose-model.js?v=optionimages20261108';
import {rememberCardOrder,validateCatalogOrder} from '/catalog-manual-order.js';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let settings,revision,products=[],cards=[],dirty=false;
async function api(url,options){const r=await fetch(url,options);if(r.status===401){location.href='/admin/login';throw Error('Logg inn på nytt.');}const data=await r.json();if(!r.ok)throw Error(data.error||'Kunne ikke lagre.');return data;}
function changed(value=true){dirty=value;$('orderSave').disabled=!dirty;$('orderDirty').textContent=dirty?'Ulagrede endringer':'';}
function render(){
 const purpose=$('orderPurpose').value,filter=$('orderCategory').value;
 cards=rentalCatalogView({products,settings,purpose,filter}).orderedCards;
 const own=settings.catalogOrder.some(r=>r.purpose===purpose&&r.category===filter);
 $('orderReset').disabled=!own;
 $('orderMode').textContent=(own?'Egen rekkefølge.':filter==='Alle'?'Vanlig rekkefølge.':'Følger rekkefølgen fra Alle.')+(purpose==='messe'&&filter==='Alle'?' Ferdige pakker vises alltid først.':'')+' Nye produkter kommer etter de sorterte kortene. Grupperte varianter flyttes samlet.';
 $('orderList').innerHTML=cards.map((c,i)=>{const p=c.product,name=p.moduleSeries||p.serviceGroup||p.name;const canMove=j=>j>=0&&j<cards.length&&!(purpose==='messe'&&filter==='Alle'&&!!c.isPackage!==!!cards[j].isPackage);return `<li class="order-row"><span class="order-number">${i+1}</span>${p.image?`<img src="${esc(p.image)}" alt="" loading="lazy">`:'<span class="order-image">–</span>'}<div><strong>${esc(name)}</strong><small>${c.isPackage?'Ferdig pakke':esc(p.category)}${c.products?.length>1?' · samlet kort':''}</small></div><div class="order-arrows"><button type="button" data-order-index="${i}" data-order-step="-1" aria-label="Flytt ${esc(name)} opp" ${canMove(i-1)?'':'disabled'}>↑</button><button type="button" data-order-index="${i}" data-order-step="1" aria-label="Flytt ${esc(name)} ned" ${canMove(i+1)?'':'disabled'}>↓</button></div></li>`;}).join('')||'<li>Ingen synlige leieprodukter i dette utvalget.</li>';
 $('orderCount').textContent=cards.length+' kort';
 $('orderPreview').href='/utvalg.html?bruk='+encodeURIComponent(purpose)+'&kategori='+encodeURIComponent(filter)+'#utvalg';
}
async function load(){const [site,catalog]=await Promise.all([api('/api/admin/site-settings'),api('/api/admin/catalog')]);settings=site.settings;settings.catalogOrder=validateCatalogOrder(settings.catalogOrder);revision=site.revision;configureSiteSettings(settings);products=sortProducts(catalog.products.filter(p=>p.active&&!p.deletedAt&&p.rentalEnabled!==false));const selected=$('orderCategory').value;$('orderCategory').innerHTML=[{id:'Alle',label:'Alle'},{id:'Enkeltprodukter',label:'Enkeltprodukter'},...settings.categories].map(c=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');if([...$('orderCategory').options].some(o=>o.value===selected))$('orderCategory').value=selected;changed(false);render();$('orderStatus').textContent='Velg bruksområde og kategori. Flytt kortene med pilene og lagre.';}
$('orderPurpose').innerHTML=purposes.map(p=>`<option value="${p.id}">${esc(p.label)}</option>`).join('');
$('orderPurpose').value='messe';
for(const id of ['orderPurpose','orderCategory'])$(id).onchange=render;
$('orderList').onclick=e=>{const b=e.target.closest('[data-order-step]');if(!b||b.disabled)return;const i=Number(b.dataset.orderIndex),j=i+Number(b.dataset.orderStep);[cards[i],cards[j]]=[cards[j],cards[i]];settings.catalogOrder=rememberCardOrder(settings.catalogOrder,$('orderPurpose').value,$('orderCategory').value,cards);changed();render();const next=document.querySelector(`[data-order-index="${j}"][data-order-step="${b.dataset.orderStep}"]`);(next?.disabled?next.parentElement.querySelector('button:not(:disabled)'):next)?.focus({preventScroll:true});$('orderStatus').textContent='Kortet er flyttet. Trykk Lagre rekkefølge for å publisere.';};
$('orderReset').onclick=()=>{settings.catalogOrder=settings.catalogOrder.filter(r=>r.purpose!==$('orderPurpose').value||r.category!==$('orderCategory').value);changed();render();$('orderStatus').textContent='Egen rekkefølge fjernet fra dette utvalget. Lagre for å publisere.';};
$('orderSave').onclick=async()=>{for(const el of document.querySelectorAll('button,select'))el.disabled=true;try{const saved=await api('/api/admin/site-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,settings})});revision=saved.revision;settings=saved.settings;changed(false);$('orderStatus').textContent='Lagret. Rekkefølgen er publisert på nettsiden.';}catch(e){$('orderStatus').textContent=e.message;}finally{for(const el of document.querySelectorAll('button,select'))el.disabled=false;render();changed(dirty);}};
$('orderReload').onclick=()=>{if(!dirty||confirm('Forkaste ulagrede rekkefølger?'))load().catch(e=>$('orderStatus').textContent=e.message);};
addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
load().catch(e=>$('orderStatus').textContent=e.message);
