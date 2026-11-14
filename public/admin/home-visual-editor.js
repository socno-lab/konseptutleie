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
 let state,mode='visual',device='desktop',selected='occasions',cardId='',frameReady=false,loading=false,timer,sourceHtml='',active=true;
 root.innerHTML=`<div class="visual-toolbar"><div class="visual-modes" role="group" aria-label="Redigeringsvisning"><button type="button" data-visual-mode="visual">Visuell forside</button><button type="button" data-visual-mode="form">Skjemavisning / øvrige sider</button></div><div class="visual-devices" role="group" aria-label="Forhåndsvis skjermstørrelse"><button type="button" data-visual-device="desktop">Desktop</button><button type="button" data-visual-device="mobile">Mobil</button></div></div><p class="visual-help">Klikk på et bruksområdekort eller et redigerbart felt. Endringer vises i utkastet og publiseres først når du lagrer. Faste sidetekster redigeres fortsatt i sidemalen.</p><div class="visual-layout"><div class="visual-preview"><div class="visual-stage"><iframe title="Visuell forhåndsvisning av forsiden – utkast" sandbox="allow-same-origin"></iframe></div><p class="visual-state" role="status">Laster forhåndsvisning …</p></div><aside class="visual-sidebar" aria-label="Rediger valgt del av forsiden"><label>Rediger seksjon<select data-visual-section>${Object.entries(sections).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><p class="visual-section-note"></p><div class="visual-fields"></div></aside></div>`;
 const frame=root.querySelector('iframe'),stage=root.querySelector('.visual-stage'),fields=root.querySelector('.visual-fields'),status=root.querySelector('.visual-state'),note=root.querySelector('.visual-section-note');
 function size(){const width=device==='mobile'?390:1280,available=stage.clientWidth;if(!available)return;const scale=Math.min(1,available/width);frame.style.width=width+'px';frame.style.height=Math.round(stage.clientHeight/scale)+'px';frame.style.transform=`scale(${scale})`;frame.style.marginLeft=Math.max(0,(available-width*scale)/2)+'px';}
 new ResizeObserver(size).observe(stage);
 function mark(){if(!frameReady)return;for(const el of frame.contentDocument.querySelectorAll('[data-v-edit]'))el.toggleAttribute('data-v-selected',el.dataset.vEdit===selected&&(selected!=='occasions'||!!cardId&&el.dataset.vCard===cardId));}
 function restoreFields(){for(const child of [...fields.children]){const marker=placeholders.get(child);if(marker?.isConnected)marker.replaceWith(child);else source.append(child);placeholders.delete(child);}}
 function select(key,id='',field='',reveal=false){
  selected=key;cardId=id;root.querySelector('[data-visual-section]').value=key;
  // Move the original fields, keeping one draft and the existing validation/save handlers.
  restoreFields();
  const section=[...source.querySelectorAll('[data-home-editor]')].find(el=>el.dataset.homeEditor===key);
  if(section){const marker=document.createComment('visual editor fields');section.before(marker);placeholders.set(section,marker);fields.append(section);}
  for(const detail of fields.querySelectorAll('[data-editor-card]'))detail.open=!!id&&detail.dataset.editorCard===id;
  if(id&&field){const detail=[...fields.querySelectorAll('[data-editor-card]')].find(el=>el.dataset.editorCard===id);const control=[...(detail?.querySelectorAll('[data-field]')||[])].find(el=>el.dataset.field.endsWith('.'+field));control?.focus({preventScroll:true});}
  mark();sectionNote();
  if(reveal){const sidebar=root.querySelector('.visual-sidebar'),detail=[...fields.querySelectorAll('[data-editor-card]')].find(el=>el.dataset.editorCard===id),target=(field?[...(detail?.querySelectorAll('[data-field]')||[])].find(el=>el.dataset.field.endsWith('.'+field))?.closest('label'):null)||detail?.querySelector('summary');sidebar.scrollTop=target?sidebar.scrollTop+target.getBoundingClientRect().top-sidebar.getBoundingClientRect().top-16:0;if(matchMedia('(max-width:900px)').matches)sidebar.scrollIntoView({block:'start'});}
 }
 function sectionNote(){
  const doc=frameReady?frame.contentDocument:null,target=doc?.querySelector(selected==='occasions'?'#homeUseCases':selected==='products'?'.home-products':selected==='packages'?'.home-featured':'#homeSeason');
  const hidden=target&&(!target.getClientRects().length||frame.contentWindow.getComputedStyle(target).display==='none');
  note.textContent=selected==='season'&&hidden?'Sesongfeltet vises ikke med dagens dato og innstillinger. Du kan endre produkt, synlighet og måneder her.':hidden?'Denne seksjonen er skjult i dagens sidemal. Valgene beholdes, men vises ikke på den publiserte forsiden.':'';
 }
 function editable(el,key,id='',label=''){
  if(!el)return;el.dataset.vEdit=key;if(id)el.dataset.vCard=id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label','Rediger '+(label||sections[key]));el.title='Klikk for å redigere '+(label||sections[key]).toLocaleLowerCase('nb');
 }
 function refresh(){clearTimeout(timer);timer=setTimeout(update,120);}
 function update(){
  if(!frameReady||!state)return;
  const doc=frame.contentDocument,{draft,products}=state,scroll=frame.contentWindow.scrollY;
  const cards=doc.querySelector('#homeUseCases');
  if(cards){cards.innerHTML=homeOccasionCards(products,draft);draft.home.occasions.filter(c=>c.visible!==false).forEach((c,i)=>editable(cards.children[i],'occasions',c.id,c.title));}
  const scoped=applyRentalScope(products.filter(p=>!p.deletedAt), 'messe');
  const productGrid=doc.querySelector('#homeProducts');if(productGrid)productGrid.innerHTML=homeProductCards(scoped,draft,p=>homeRateGrid(p,{products:scoped}));
  editable(doc.querySelector('.home-products'),'products');
  const packages=doc.querySelector('#homePackages');if(packages){packages.innerHTML=draft.home.packages.map(id=>scoped.find(p=>p.id===id&&p.active)).filter(Boolean).map(p=>`<article><button type="button" class="home-package-photo"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><span class="home-example">Bildet viser et eksempel</span></button><div class="home-package-copy"><h3>${esc(p.name)}</h3><p>${esc(p.material)}</p>${homeRateGrid(p,{products:scoped})}<button type="button" class="text-button">Se pakken og tilpass ↗</button></div></article>`).join('')||'<p>Vi hjelper deg å sette sammen en løsning. Fortell oss hva du trenger.</p>';}
  editable(doc.querySelector('.home-featured'),'packages');
  const season=doc.querySelector('#homeSeason');if(season){const html=homeSeasonContent(scoped,draft.home);season.innerHTML=html;season.hidden=!html;editable(season,'season');}
  mark();sectionNote();frame.contentWindow.scrollTo(0,scroll);status.textContent='Utkast · klikk på markerte områder for å redigere. Lenker åpner ikke andre sider i forhåndsvisningen.';
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
  doc.addEventListener('click',event=>{const target=event.target.closest('[data-v-edit]');if(target){event.preventDefault();event.stopPropagation();select(target.dataset.vEdit,target.dataset.vCard||'',event.target.closest('img')?'image':event.target.closest('h3')?'title':'',true);}else if(event.target.closest('a,button,input,select,textarea')){event.preventDefault();event.stopPropagation();}},true);
  doc.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){const target=event.target.closest('[data-v-edit]');if(target){event.preventDefault();select(target.dataset.vEdit,target.dataset.vCard||'','',true);}}});
  update();size();
 });
 function display(){
  const show=active&&mode==='visual';root.hidden=!active;source.hidden=show;
  root.querySelector('.visual-layout').hidden=!show;root.querySelector('.visual-help').hidden=!show;root.querySelector('.visual-devices').hidden=!show;
  document.querySelector('.settings-main').classList.toggle('has-visual-editor',show);
  for(const b of root.querySelectorAll('[data-visual-mode]'))b.setAttribute('aria-pressed',String(b.dataset.visualMode===mode));
  for(const b of root.querySelectorAll('[data-visual-device]'))b.setAttribute('aria-pressed',String(b.dataset.visualDevice===device));
  if(show){select(selected,cardId);size();loadPreview();}else restoreFields();
 }
 root.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.visualMode){mode=b.dataset.visualMode;display();}if(b.dataset.visualDevice){device=b.dataset.visualDevice;display();sectionNote();}});
 root.querySelector('[data-visual-section]').addEventListener('change',event=>{select(event.target.value,'','',true);const doc=frameReady?frame.contentDocument:null;const target=doc?.querySelector(selected==='occasions'?'#homeUseCases':selected==='products'?'.home-products':selected==='packages'?'.home-featured':'#homeSeason');if(target?.getClientRects().length)target.scrollIntoView({block:'center'});});
 return {refresh,render(next){state=next;active=next.active;fields.replaceChildren();placeholders.clear();display();if(active)refresh();}};
}
