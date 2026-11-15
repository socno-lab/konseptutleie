import {applyProductCopy} from '../home-product-copy.js?v=productcopy20261115';
import {homeOccasionCards} from '../home-occasions.js?v=fest20261114';
import {homeProductCards,homeSeasonContent,homeRateGrid} from '../home-sections.js?v=fest20261114';
import {applyRentalScope} from '../rental-pricing-model.js?v=fest20261114';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections={occasions:'Bruksområdekort',products:'Fremhevede produkter',packages:'Fremhevede pakker',season:'Sesongfelt'};

// The preview has no scripts, forms or active links. Only the parent admin edits the draft.
export function previewDocument(source){
 const doc=new DOMParser().parseFromString(source,'text/html');
 doc.querySelectorAll('script,iframe,object,embed,base,form,dialog,template,meta[http-equiv="refresh"],link[rel="preload"][as="script"],link[rel="modulepreload"]').forEach(el=>el.remove());
 for(const el of doc.querySelectorAll('*'))for(const attr of [...el.attributes])if(/^on/i.test(attr.name)||attr.name==='srcdoc')el.removeAttribute(attr.name);
 doc.querySelectorAll('a').forEach(el=>{el.removeAttribute('href');el.removeAttribute('target');});
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';policy.content="script-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'";doc.head.prepend(policy);
 const style=doc.createElement('style');style.textContent='[data-v-edit]{cursor:pointer!important;outline-offset:4px}[data-v-edit]:hover,[data-v-edit]:focus-visible{outline:2px dashed #717e60}[data-v-selected]{outline:3px solid #424e38!important}[data-v-edit] *{cursor:pointer!important}html{scroll-behavior:auto!important}';doc.head.append(style);
 return '<!doctype html>'+doc.documentElement.outerHTML;
}

export function homeVisualEditor({root,source}){
 const placeholders=new Map();
 let cardLayout=null,knownCardIds=null;
 let state,mode='visual',device='desktop',selected='occasions',cardId='',frameReady=false,loading=false,timer,sourceHtml='',active=true;
 root.innerHTML=`<div class="visual-toolbar"><div class="visual-modes" role="group" aria-label="Redigeringsvisning"><button type="button" data-visual-mode="visual">Visuell forside</button><button type="button" data-visual-mode="form">Skjemavisning / øvrige sider</button></div><div class="visual-devices" role="group" aria-label="Forhåndsvis skjermstørrelse"><button type="button" data-visual-device="desktop">Desktop</button><button type="button" data-visual-device="mobile">Mobil</button></div></div><p class="visual-help">Klikk på kortets navn for å endre navnet, eller på bildet for å velge et nytt. Du kan også bruke panelet ved siden av. Endringene publiseres når du trykker Lagre og publiser.</p><div class="visual-layout"><div class="visual-preview"><div class="visual-stage"><div class="visual-canvas"><iframe title="Visuell forhåndsvisning av forsiden – utkast" sandbox="allow-same-origin" tabindex="-1" aria-hidden="true"></iframe><div class="visual-targets" aria-label="Rediger områder i forhåndsvisningen"></div></div></div><p class="visual-state" role="status">Laster forhåndsvisning …</p></div><aside class="visual-sidebar" aria-label="Rediger valgt del av forsiden"><label>Rediger seksjon<select data-visual-section>${Object.entries(sections).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><p class="visual-section-note"></p><div class="visual-fields"></div></aside></div>`;
 const picker=document.createElement('dialog');picker.className='visual-image-picker';picker.setAttribute('aria-label','Velg bilde til kortet');picker.innerHTML='<div class=visual-picker-head><h2>Velg bilde</h2><button type=button data-close-image>Lukk</button></div><label>Søk i bildebiblioteket<input type=search data-image-search placeholder="Søk etter bilde eller produkt"></label><p class=visual-image-count role=status></p><div class=visual-image-grid></div>';root.append(picker);
 const frame=root.querySelector('iframe'),stage=root.querySelector('.visual-stage'),fields=root.querySelector('.visual-fields'),status=root.querySelector('.visual-state'),note=root.querySelector('.visual-section-note');
 const canvas=root.querySelector('.visual-canvas'),targets=root.querySelector('.visual-targets');
 let previewScale=1,geometryFrame=0,previewObserver;
 // WebKit blocks parent-installed listeners inside a script-disabled sandbox (bug 218086).
 // Keep the sandbox; native buttons and native scrolling live in the parent document.
 function scheduleGeometry(){cancelAnimationFrame(geometryFrame);geometryFrame=requestAnimationFrame(size);}
 function size(){
  const width=device==='mobile'?390:1280,available=stage.clientWidth;if(!available)return;
  previewScale=Math.min(1,available/width);const left=Math.max(0,(available-width*previewScale)/2);
  frame.style.width=width+'px';frame.style.transform=`scale(${previewScale})`;frame.style.left=left+'px';
  if(!frameReady){frame.style.height=Math.round(stage.clientHeight/previewScale)+'px';canvas.style.height=stage.clientHeight+'px';return;}
  const doc=frame.contentDocument;
  // Reset the viewport before measuring, so switching to desktop can shrink the canvas.
  frame.style.height=Math.round(stage.clientHeight/previewScale)+'px';
  const height=Math.max(doc.documentElement.scrollHeight,doc.body.scrollHeight);
  frame.style.height=height+'px';canvas.style.height=Math.ceil(height*previewScale)+'px';
  for(const button of targets.children){const el=button.previewElement;if(!el?.isConnected)continue;const r=el.getBoundingClientRect();button.hidden=!r.width||!r.height;
   button.style.left=(left+r.left*previewScale)+'px';button.style.top=(r.top*previewScale)+'px';button.style.width=r.width*previewScale+'px';button.style.height=r.height*previewScale+'px';
  }
 }
 new ResizeObserver(scheduleGeometry).observe(stage);
 function mark(){if(!frameReady)return;for(const button of targets.children){const el=button.previewElement,chosen=el.dataset.vEdit===selected&&(selected!=='occasions'||!!cardId&&el.dataset.vCard===cardId);button.setAttribute('aria-pressed',String(chosen));el.toggleAttribute('data-v-selected',chosen);}}
 function rebuildTargets(){
  const buttons=[...frame.contentDocument.querySelectorAll('[data-v-edit]')].map(el=>{const button=document.createElement('button');button.type='button';button.className='visual-preview-target';button.previewElement=el;button.setAttribute('aria-label',el.getAttribute('aria-label'));button.title=el.title;return button;});
  targets.replaceChildren(...buttons);mark();size();
 }
 targets.addEventListener('pointerdown',event=>{if(event.target.closest('button'))event.preventDefault();});
 targets.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;const el=button.previewElement;if(!el?.isConnected)return;
  const r=frame.getBoundingClientRect(),hit=event.detail?frame.contentDocument.elementFromPoint((event.clientX-r.left)/previewScale,(event.clientY-r.top)/previewScale):null;
  const field=el.dataset.vEdit==='occasions'?(hit?.closest('img')?'image':'title'):el.dataset.vEdit==='products'?(hit?.closest('#homeProductsIntro')?'productsIntro':hit?.closest('#homeProductsHeading')?'productsHeading':''):'';
  select(el.dataset.vEdit,el.dataset.vCard||'',field,true);
 });
 function restoreCardLayout(){if(!cardLayout)return;const {section,nodes,detail,children}=cardLayout;detail?.replaceChildren(...children);section.replaceChildren(...nodes);section.querySelectorAll('[data-editor-card]').forEach(el=>{el.hidden=false;el.removeAttribute('data-current-card');});cardLayout=null;}
 function restoreFields(){restoreCardLayout();for(const child of [...fields.children]){const marker=placeholders.get(child);if(marker?.isConnected)marker.replaceWith(child);else source.append(child);placeholders.delete(child);}}
 function select(key,id='',field='',reveal=false){
  selected=key;cardId=key==='occasions'?(state.draft.home.occasions.some(c=>c.id===id)?id:state.draft.home.occasions[0]?.id||''):id;id=cardId;root.querySelector('[data-visual-section]').value=key;
  // Move the original fields, keeping one draft and the existing validation/save handlers.
  restoreFields();
  const section=[...source.querySelectorAll('[data-home-editor]')].find(el=>el.dataset.homeEditor===key);
  if(section){const marker=document.createComment('visual editor fields');section.before(marker);placeholders.set(section,marker);fields.append(section);}
  for(const detail of fields.querySelectorAll('[data-editor-card]'))detail.open=!!id&&detail.dataset.editorCard===id;
  if(key==='occasions'&&section)simpleCardFields(section,id);
  if(id&&field==='title'){const detail=[...fields.querySelectorAll('[data-editor-card]')].find(el=>el.dataset.editorCard===id);const control=[...(detail?.querySelectorAll('[data-field]')||[])].find(el=>el.dataset.field.endsWith('.'+field));control?.focus({preventScroll:true});}
  if(key==='products'&&field)fields.querySelector(`[data-field="home.${field}"]`)?.focus({preventScroll:true});
  mark();sectionNote();
  if(reveal&&key==='occasions'&&field==='image')openImagePicker();
  if(reveal){const sidebar=root.querySelector('.visual-sidebar'),detail=[...fields.querySelectorAll('[data-editor-card]')].find(el=>el.dataset.editorCard===id),target=detail?.querySelector('.visual-card-basic')||detail?.querySelector('summary');sidebar.scrollTop=target?sidebar.scrollTop+target.getBoundingClientRect().top-sidebar.getBoundingClientRect().top-16:0;sidebar.scrollIntoView({block:matchMedia('(max-width:900px)').matches?'start':'nearest'});}
 }
 function simpleCardFields(section,id){
  const detail=[...section.querySelectorAll('[data-editor-card]')].find(el=>el.dataset.editorCard===id),nodes=[...section.childNodes],children=detail?[...detail.childNodes]:[];
  cardLayout={section,nodes,detail,children};
  const tools=document.createElement('div');tools.className='visual-card-tools';tools.innerHTML='<h2>Rediger kort</h2><label>Velg kort<select data-visual-card>'+state.draft.home.occasions.map(c=>`<option value="${esc(c.id)}" ${c.id===id?'selected':''}>${esc(c.title)}${c.visible===false?' · skjult':''}</option>`).join('')+'</select></label><button type="button" data-card-add>+ Nytt kort</button>';
  section.prepend(tools);
  section.querySelectorAll('[data-editor-card]').forEach(el=>{el.hidden=el!==detail;el.toggleAttribute('data-current-card',el===detail);});
  if(!detail)return;
  const basic=document.createElement('div');basic.className='visual-card-basic';
  const title=detail.querySelector('[data-field$=".title"]').closest('label'),visible=detail.querySelector('[data-field$=".visible"]').closest('label');
  const index=state.draft.home.occasions.findIndex(c=>c.id===id),card=state.draft.home.occasions[index],product=state.products.find(p=>p.id===card.productId),url=card.image||product?.image||'/assets/hero.jpg';
  basic.append(title);
  const image=document.createElement('div');image.className='visual-card-image';image.innerHTML=`<img src="${esc(url)}" alt="Bilde på ${esc(card.title)}"><button type="button" data-visual-image>Velg bilde</button>`;
  basic.append(image,visible);
  const more=document.createElement('details');more.className='visual-card-more';more.innerHTML='<summary>Lenke, rekkefølge og øvrige valg</summary>';
  for(const child of children)if(child!==title&&child!==visible&&child.nodeName!=='SUMMARY')more.append(child);
  detail.append(basic,more);
 }
 function imageItems(){
  const images=(state.images||[]).filter(m=>!m.deletedAt),query=picker.querySelector('[data-image-search]').value.trim().toLocaleLowerCase('nb');
  const matches=images.filter(m=>(m.name+' '+(state.draft.imageNames?.find(n=>n.url===m.url)?.name||'')).toLocaleLowerCase('nb').includes(query));
  const shown=matches.slice(0,80);picker.querySelector('.visual-image-count').textContent=`${matches.length} bilder${matches.length>80?' · viser de første 80. Søk for å finne flere.':''}`;
  picker.querySelector('.visual-image-grid').innerHTML=shown.map(m=>`<button type="button" data-select-image="${esc(m.url)}"><img src="${esc(m.url)}${/^\/media\/[a-f0-9]{32}$/.test(m.url)?'?thumb=320':''}" alt="" loading="lazy"><span>${esc(state.draft.imageNames?.find(n=>n.url===m.url)?.name||m.name)}</span></button>`).join('')||'<p>Ingen bilder passer søket.</p>';
 }
 function openImagePicker(){picker.querySelector('[data-image-search]').value='';imageItems();if(!picker.open)picker.showModal();}
 picker.querySelector('[data-image-search]').addEventListener('input',imageItems);
 picker.querySelector('[data-image-search]').addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();});
 picker.addEventListener('click',event=>{if(event.target.closest('[data-close-image]')){picker.close();return;}const b=event.target.closest('[data-select-image]');if(!b)return;
  const select=fields.querySelector('[data-current-card] select[data-field$=".image"]');if(!select)return;const url=b.dataset.selectImage;if(![...select.options].some(o=>o.value===url))select.add(new Option('Valgt bilde',url));select.value=url;picker.close();select.dispatchEvent(new Event('change',{bubbles:true}));
 });
 root.addEventListener('change',event=>{if(event.target.matches('[data-visual-card]'))select('occasions',event.target.value,'',true);});
 function sectionNote(){
  const doc=frameReady?frame.contentDocument:null,target=doc?.querySelector(selected==='occasions'?'#homeUseCases':selected==='products'?'.home-products':selected==='packages'?'.home-featured':'#homeSeason');
  const hidden=target&&(!target.getClientRects().length||frame.contentWindow.getComputedStyle(target).display==='none');
  note.textContent=selected==='season'&&hidden?'Sesongfeltet vises ikke med dagens dato og innstillinger. Du kan endre produkt, synlighet og måneder her.':hidden?'Denne seksjonen er skjult i dagens sidemal. Valgene beholdes, men vises ikke på den publiserte forsiden.':'';
 }
 function disableNavigation(doc){doc.querySelectorAll('a').forEach(el=>{el.removeAttribute('href');el.removeAttribute('target');el.removeAttribute('download');});}
 function editable(el,key,id='',label=''){
  if(!el)return;el.dataset.vEdit=key;if(id)el.dataset.vCard=id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Rediger '+(label||sections[key]));el.title='Klikk for å redigere '+(label||sections[key]).toLocaleLowerCase('nb');
 }
 function refresh(){clearTimeout(timer);timer=setTimeout(update,120);}
 function update(){
  if(!frameReady||!state)return;
  const doc=frame.contentDocument,{draft,products}=state,scroll=stage.scrollTop;
  applyProductCopy(doc,draft.home);
  const cards=doc.querySelector('#homeUseCases');
  if(cards){cards.innerHTML=homeOccasionCards(products,draft);draft.home.occasions.filter(c=>c.visible!==false).forEach((c,i)=>editable(cards.children[i],'occasions',c.id,c.title));}
  const scoped=applyRentalScope(products.filter(p=>!p.deletedAt), 'messe');
  const productGrid=doc.querySelector('#homeProducts');if(productGrid)productGrid.innerHTML=homeProductCards(scoped,draft,p=>homeRateGrid(p,{products:scoped}));
  editable(doc.querySelector('.home-products'),'products');
  const packages=doc.querySelector('#homePackages');if(packages){packages.innerHTML=draft.home.packages.map(id=>scoped.find(p=>p.id===id&&p.active)).filter(Boolean).map(p=>`<article><button type="button" class="home-package-photo"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><span class="home-example">Bildet viser et eksempel</span></button><div class="home-package-copy"><h3>${esc(p.name)}</h3><p>${esc(p.material)}</p>${homeRateGrid(p,{products:scoped})}<button type="button" class="text-button">Se pakken og tilpass ↗</button></div></article>`).join('')||'<p>Vi hjelper deg å sette sammen en løsning. Fortell oss hva du trenger.</p>';}
  editable(doc.querySelector('.home-featured'),'packages');
  const season=doc.querySelector('#homeSeason');if(season){const html=homeSeasonContent(scoped,draft.home);season.innerHTML=html;season.hidden=!html;editable(season,'season');}
  disableNavigation(doc);rebuildTargets();sectionNote();stage.scrollTop=scroll;status.textContent='Utkast · klikk på markerte områder for å redigere. Lenker åpner ikke andre sider i forhåndsvisningen.';
 }
 async function loadPreview(){
  if(loading||frameReady)return;loading=true;
  try{if(!sourceHtml){const r=await fetch('/',{cache:'no-store'});if(!r.ok)throw Error();sourceHtml=previewDocument(await r.text());}frame.srcdoc=sourceHtml;}
  catch{status.textContent='Kunne ikke laste forhåndsvisningen. Bruk skjemavisningen, eller prøv igjen.';sourceHtml='';}
  finally{loading=false;}
 }
 frame.addEventListener('load',()=>{
  if(!frame.contentDocument?.querySelector('#homeUseCases'))return;frameReady=true;
  const doc=frame.contentDocument;
  previewObserver?.disconnect();previewObserver=new ResizeObserver(scheduleGeometry);previewObserver.observe(doc.body);
  update();size();
  // Parent-side image load observation also catches layout changes without child scripts.
  for(const img of doc.images)img.decode?.().then(scheduleGeometry,()=>{});
 });
 function display(){
  const show=active&&mode==='visual';root.hidden=!active;source.hidden=show;
  root.querySelector('.visual-layout').hidden=!show;root.querySelector('.visual-help').hidden=!show;root.querySelector('.visual-devices').hidden=!show;
  document.querySelector('.settings-main').classList.toggle('has-visual-editor',show);
  for(const b of root.querySelectorAll('[data-visual-mode]'))b.setAttribute('aria-pressed',String(b.dataset.visualMode===mode));
  for(const b of root.querySelectorAll('[data-visual-device]'))b.setAttribute('aria-pressed',String(b.dataset.visualDevice===device));
  if(show){select(selected,cardId);size();loadPreview();}else restoreFields();
 }
 root.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-visual-image')){openImagePicker();return;}if(b.dataset.visualMode){mode=b.dataset.visualMode;display();}if(b.dataset.visualDevice){device=b.dataset.visualDevice;display();sectionNote();}});
 root.querySelector('[data-visual-section]').addEventListener('change',event=>{select(event.target.value,'','',true);const doc=frameReady?frame.contentDocument:null;const target=doc?.querySelector(selected==='occasions'?'#homeUseCases':selected==='products'?'.home-products':selected==='packages'?'.home-featured':'#homeSeason');if(target?.getClientRects().length){stage.scrollTop=Math.max(0,target.getBoundingClientRect().top*previewScale-24);}});
 return {refresh,render(next){const ids=next.draft.home.occasions.map(c=>c.id),added=knownCardIds&&ids.filter(id=>!knownCardIds.has(id));if(added?.length){selected='occasions';cardId=added.at(-1);}knownCardIds=new Set(ids);state=next;active=next.active;restoreCardLayout();fields.replaceChildren();placeholders.clear();display();queueMicrotask(()=>{const detail=fields.querySelector('[data-current-card]');if(detail)detail.open=true;});if(active)refresh();}};
}
