import {getSiteSettings} from './site-settings.js';

const header=document.querySelector('body>header');
if(header?.querySelector('.brand')&&!header.hasAttribute('data-mobile-menu-bound'))mountMobileMenu(header);

function mountMobileMenu(header){
 header.setAttribute('data-mobile-menu-bound','');
 const mobile=matchMedia('(max-width:640px)'),brand=header.querySelector('.brand'),desktopNav=header.querySelector('nav'),bag=header.querySelector('.bag');
 const toggle=header.querySelector('.mobile-menu-toggle')||document.createElement('button');toggle.type='button';toggle.className='mobile-menu-toggle';toggle.setAttribute('aria-label','Åpne meny');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','mobileMenuPanel');toggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M3 12h18M3 18h18" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
 if(!toggle.parentNode)header.prepend(toggle);header.classList.add('has-mobile-menu');
 const layer=header.nextElementSibling?.classList.contains('mobile-menu-layer')?header.nextElementSibling:document.createElement('div');layer.className='mobile-menu-layer';layer.hidden=true;
 const outside=layer.querySelector('.mobile-menu-outside')||document.createElement('button');outside.type='button';outside.className='mobile-menu-outside';outside.tabIndex=-1;outside.setAttribute('aria-label','Lukk meny');
 const panel=layer.querySelector('#mobileMenuPanel')||document.createElement('nav');panel.id='mobileMenuPanel';panel.className='mobile-menu-panel';panel.setAttribute('aria-label','Mobilmeny');if(!outside.parentNode)layer.append(outside);if(!panel.parentNode)layer.append(panel);if(!layer.parentNode)header.after(layer);
 if(bag){
  for(const node of [...bag.childNodes])if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()&&node.textContent.trim()!=='↗'){const label=document.createElement('span');label.className='mobile-bag-label';label.textContent=node.textContent.replace('↗','');node.replaceWith(label);}
  const icon=bag.querySelector('.mobile-bag-icon')||document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('class','mobile-bag-icon');icon.setAttribute('aria-hidden','true');icon.innerHTML='<path d="M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>';if(!icon.parentNode)bag.prepend(icon);
  // Keep the existing basket element, count node and click handlers intact.
  const count=bag.querySelector('#count,#saleCount'),updateLabel=()=>bag.setAttribute('aria-label',(bag.id==='openSaleCart'?'Handlekurv for kjøp':'Din leieforespørsel')+(count?' – '+count.textContent.trim()+(count.textContent.trim()==='1'?' vare':' varer'):''));
  if(count)new MutationObserver(updateLabel).observe(count,{childList:true,subtree:true,characterData:true});updateLabel();
 }
 const defaults=[['Leie','/'],['Kjøpe','/kjop.html'],['Pakker & tjenester','/utvalg.html?bruk=alle&kategori=Pakker#utvalg'],['Skreddersydd','/#skreddersydd'],['Slik fungerer det','/#slik']];
 const areaUrls={boligfoto:'/utvalg.html?bruk=boligsalg&kategori=Enkeltprodukter#utvalg',messe:'/anledning.html?bruk=messe&anledning=messe',bryllup:'/anledning.html?bruk=fest&anledning=bryllup',jul:'/anledning.html?bruk=jul&anledning=jul',bedrift:'/anledning.html?bruk=bedrift&anledning=bedrift',alle:'/utvalg.html?bruk=alle#utvalg'};
 function link(label,href){const a=document.createElement('a');a.textContent=label;a.href=href;const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='›';a.append(arrow);return a;}
 function render(){
  panel.replaceChildren();const main=document.createElement('div');main.className='mobile-menu-main';
  const existing=[...(desktopNav?.querySelectorAll('a')||[])];
  for(const [label,href] of defaults){const source=existing.find(a=>a.getAttribute('href')===href||a.textContent.trim()===label||href.includes('kategori=Pakker')&&a.classList.contains('packages-nav'));const a=link(source?.textContent.trim()||label,source?.getAttribute('href')||href);if(source?.hasAttribute('aria-current'))a.setAttribute('aria-current',source.getAttribute('aria-current'));main.append(a);}
  const title=document.createElement('p');title.className='mobile-menu-section-title';title.textContent='Finn utvalg etter bruk';
  const areas=document.createElement('div');areas.className='mobile-menu-areas';for(const area of getSiteSettings().home.occasions)if(areaUrls[area.id])areas.append(link(area.title,areaUrls[area.id]));panel.append(main,title,areas);
 }
 let scrollY=0,previousInert=[];
 function close(restoreFocus=true){
  if(layer.hidden)return;layer.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Åpne meny');
  for(const [element,inert] of previousInert)element.inert=inert;previousInert=[];document.body.classList.remove('mobile-menu-open');document.body.style.removeProperty('--mobile-menu-scroll');window.scrollTo({top:scrollY,behavior:'instant'});if(restoreFocus&&mobile.matches)toggle.focus({preventScroll:true});
 }
 function open(keyboard=false){
  if(!mobile.matches)return;render();scrollY=window.scrollY;document.documentElement.style.setProperty('--mobile-menu-top',header.getBoundingClientRect().bottom+'px');
  previousInert=[...document.body.children].filter(e=>e!==header&&e!==layer&&!['SCRIPT','STYLE','DIALOG'].includes(e.tagName)).map(e=>[e,e.inert]);for(const [element] of previousInert)element.inert=true;
  document.body.style.setProperty('--mobile-menu-scroll',-scrollY+'px');document.body.classList.add('mobile-menu-open');layer.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Lukk meny');if(keyboard)panel.querySelector('a')?.focus({preventScroll:true});
 }
 toggle.addEventListener('click',event=>layer.hidden?open(event.detail===0):close());outside.addEventListener('click',()=>close());panel.addEventListener('click',e=>{if(e.target.closest('a'))close(false);});
 header.addEventListener('click',e=>{if(!layer.hidden&&e.target.closest('a,.bag'))close(false);},true);
 document.addEventListener('keydown',e=>{
  if(layer.hidden)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
  if(e.key==='Tab'){const targets=[toggle,brand,bag,...panel.querySelectorAll('a')].filter(e=>e&&!e.inert&&e.getClientRects().length),index=targets.indexOf(document.activeElement);if(e.shiftKey&&index<=0){e.preventDefault();targets.at(-1).focus();}else if(!e.shiftKey&&(index<0||index===targets.length-1)){e.preventDefault();targets[0].focus();}}
 });
 mobile.addEventListener('change',()=>{if(!mobile.matches)close(false);});
 window.addEventListener('resize',()=>{if(!layer.hidden)document.documentElement.style.setProperty('--mobile-menu-top',header.getBoundingClientRect().bottom+'px');});
 window.addEventListener('pagehide',()=>close(false));
}
