import {reasons,transitionTable,countingReport} from './inventory-control.js?v=stock-tools1';
import {esc as escape,states,stockRows,stockControls,stockResults,jobResults,defaults,jobDefaults,photo} from './workspace.js?v=8';
import {foldProductSearch,inferProductBrand} from '../product-brand.js';
const screen=document.querySelector('#screen'),nav=document.querySelector('#nav'),status=document.querySelector('#status'),stylistMenu=document.querySelector('#stylistMenu');
let sessions=[],countSession=null;
const historyLabels={...states,...reasons,returned:'Returnert til lager',transferred:'Flyttet til annet oppdrag','transferred-in':'Flyttet hit fra annet oppdrag',unassigned:'Fjernet fra oppdrag'};
const itemPattern=/^K-[0-9A-F]{16}$/;
const button=(label,action,value='',primary=false)=>'<button type="button" class="button '+(primary?'dark':'button-outline')+'" data-action="'+action+'" data-value="'+escape(value)+'">'+escape(label)+'</button>';
const submit=label=>'<button class="button dark">'+label+'</button>';
const previewRequested=new URLSearchParams(location.search).get('visning')==='stylist';
const isPreview=()=>previewRequested&&data?.admin;
const isAdminView=()=>data?.admin&&!isPreview();
const landingPage=()=>isAdminView()?'jobs':'stylist-home';
const params=new URLSearchParams(location.hash.slice(1));
let invitation=params.get('invite'),itemId=new URLSearchParams(location.search).get('item'),page=itemId?'item':'stylist-home';
let data,jobId='',labels=[],selectedProduct='',history=[],inviteUrl='',stream,scanSession=0,working=false;
const item=()=>data.items.find(i=>i.id===itemId);
const itemPhoto=i=>photo(data.products.find(p=>p.id===i.product));
const jobName=id=>data.jobs.find(j=>j.id===id)?.address||'';
const sideNames={left:'Venstre endemodul',right:'Høyre endemodul'};
function productName(i){
  const name=data.products.find(p=>p.id===i.product)?.name||i.name;
  return i.side?name.replace(/grunnsofa med begge ender/i,'').replace(/–\s*,/g,',').replace(/\s+,/g,',')+' · '+sideNames[i.side]:name;
}
const date=t=>new Date(Number(t)).toLocaleString('nb-NO');
let usagePeriod='90',usageOrder='most',usageProducts=[];
const usageNumber=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:1});
async function loadUsage(){usageProducts=(await api('usage/'+usagePeriod)).products;}
function usageView(){
 const products=usageProducts.filter(p=>usageOrder==='never'?!p.everUsed:p.everUsed);
 const compare=(a,b)=>a.jobs-b.jobs||a.checkouts-b.checkouts||a.days-b.days;
 products.sort((a,b)=>(usageOrder==='least'?compare(a,b):compare(b,a))||a.name.localeCompare(b.name,'nb'));
 const options=(values,selected)=>values.map(([value,label])=>'<option value="'+value+'" '+(value===selected?'selected':'')+'>'+label+'</option>').join('');
 return '<h1>Bruksstatistikk</h1><div class="filters usage-filters"><label>Periode<select data-usage="period">'+options([['30','Siste 30 dager'],['90','Siste 90 dager'],['365','Siste 365 dager'],['all','Hele historikken']],usagePeriod)+'</select></label><label>Visning<select data-usage="order">'+options([['most','Mest brukt'],['least','Minst brukt'],['never','Aldri brukt']],usageOrder)+'</select></label></div>'
  +'<p>Oppdrag og utsjekkinger telles i valgt periode. Dager ute omfatter også pågående oppdrag i perioden. Dager per enhet fordeles på enheter som har vært godkjent for lager.</p>'
  +(usageOrder==='never'?'<p>Aldri brukt betyr ingen utsjekking i hele QR-historikken etter at produktet ble tilgjengelig.</p>':'')
  +(products.length?'<div class="usage-table" tabindex="0" role="region" aria-label="Bruksstatistikk per produkt"><table><thead><tr><th scope="col">Produkt</th><th scope="col">Oppdrag</th><th scope="col">Enheter brukt</th><th scope="col">Utsjekkinger</th><th scope="col">Dager ute</th><th scope="col">Dager per enhet</th><th scope="col">Først tilgjengelig</th></tr></thead><tbody>'+products.map(p=>'<tr><th scope="row">'+escape(p.name)+'</th><td>'+p.jobs+'</td><td>'+p.unitsUsed+'</td><td>'+p.checkouts+'</td><td>'+usageNumber.format(p.days)+'</td><td>'+usageNumber.format(p.daysPerUnit)+'</td><td>'+new Date(p.first).toLocaleDateString('nb-NO')+'</td></tr>').join('')+'</tbody></table></div>':'<p>Ingen produkter i denne visningen ennå.</p>');
}
const stockFilter={...defaults},pickFilter={...defaults},jobFilter={...jobDefaults};
let source='stock',productId='',itemOrigin='',rows=[];
const archivedJobs=()=>data.jobs.filter(job=>job.closed);
function activeFilter(){return ['jobs','archive'].includes(page)?jobFilter:page==='pick'?pickFilter:stockFilter;}
function stopCamera(){scanSession++;stream?.getTracks().forEach(track=>track.stop());stream=null;}
window.addEventListener('pagehide',stopCamera);
async function api(route,body){
  const response=await fetch('/api/styling/'+route,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error||'Kunne ikke kontakte lageret.'),{status:response.status});
  return result;
}
async function load(){
  data=await api('overview');
  rows=stockRows(data);
  if(isAdminView()&&!document.querySelector('.admin-shell nav')){
    const {mountAdminNavigation}=await import('/admin/navigation.js?v=rail2');
    const shell=document.querySelector('.admin-shell');
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='/admin/navigation.css?v=rail2';
    const loaded=new Promise(resolve=>{css.onload=css.onerror=resolve;});
    document.head.append(css);
    await loaded;
    mountAdminNavigation(shell);
  }
}
function go(next){stopCamera();page=next;status.textContent='';render();}
async function sendStylistInvite(email,replace=false){
  const invitation=await api('invite',{email,replace});
  inviteUrl=invitation.sent?'':invitation.url;
  await load();
  go('staff');
  status.textContent=invitation.sent?'Invitasjon sendt til '+email+'.':'E-posten kunne ikke bekreftes sendt. Kopier invitasjonslenken nedenfor eller prøv å sende på nytt.';
}
async function showItem(id){
  itemId=id;history=await api('history/'+encodeURIComponent(id));go('item');
}
const openJobs=()=>data.jobs.filter(job=>!job.closed);
function jobOptions(){return openJobs().map(j=>'<option value="'+escape(j.id)+'" '+(j.id===jobId?'selected':'')+'>'+escape(j.address)+'</option>').join('');}
function listItem(i){
  return '<section class="record"><div class="scan-identity">'+itemPhoto(i)+'<div><h2>'+escape(productName(i))+'</h2><p>'+escape(i.id)+' · '+states[i.state]+'</p></div></div>'
    +'<div class="actions">'+button('Åpne møbel','item',i.id)
    +(i.state==='assigned'?button('Fjern fra oppdraget','unassign',i.id):'')+'</div></section>';
}
let jobReturns={units:[],deviations:[]};
async function loadJobReturns(){jobReturns=await api('job-returns/'+jobId);}
const pendingReturns=()=>jobReturns.units.filter(unit=>unit.movement==='check'&&unit.is_latest&&unit.state==='check');
function jobHistory(){
  const events=jobReturns.history||[];
  const reportable=new Set(jobReturns.units.filter(unit=>unit.is_latest&&unit.state==='ready'&&unit.movement==='returned').map(unit=>unit.id));
  const products=new Map();
  for(const event of events){
    const key=JSON.stringify([event.product,event.side]);
    if(!products.has(key))products.set(key,new Map());
    const units=products.get(key);
    if(!units.has(event.id))units.set(event.id,[]);
    units.get(event.id).push(event);
  }
  const statusLabel=state=>state==='returned'?states.ready:historyLabels[state]||state;
  const rows=[];
  for(const units of products.values()){
    const first=units.values().next().value[0];
    const counts=new Map();
    const details=[];
    for(const history of units.values()){
      const latest=history[0];
      const label=statusLabel(latest.state);
      counts.set(label,(counts.get(label)||0)+1);
      details.push('<div><strong>'+escape(latest.id)+'</strong><ul>'+history.map(event=>
        '<li>'+escape(date(event.created))+' · '+escape(historyLabels[event.state]||event.state)+' · '+escape(event.actor)+'</li>'
      ).join('')+'</ul>'+(reportable.has(latest.id)?button('Marker som skadet','report-damage',latest.id):'')+'</div>');
    }
    const summary=[...counts].map(([label,n])=>n+' × '+escape(label)).join(' · ');
    rows.push('<details class="history-product"><summary><span class="scan-identity">'+itemPhoto(first)+'<span>'+escape(productName(first))+'<small>'+summary+'</small></span></span></summary>'+details.join('')+'</details>');
  }
  return '<details><summary>Møbler benyttet på oppdraget</summary>'
    +(rows.join('')||'<p>Ingen møbler registrert på oppdraget ennå.</p>')+'</details>';
}
function returnOverview(job,out,assigned){
  const returned=jobReturns.units.filter(unit=>['returned','check'].includes(unit.movement));
  const pending=pendingReturns();
  const transferred=jobReturns.units.filter(unit=>unit.movement==='transferred').length;
  const reportedMissing=new Set(jobReturns.deviations.filter(entry=>entry.kind==='missing').map(entry=>entry.item));
  const missing=out.filter(unit=>reportedMissing.has(unit.id));
  const unitLabel=unit=>escape(productName(unit))+' · '+escape(unit.id);
  const totals=[['Skannet ut',jobReturns.units.length],['Ute på styling',out.length-missing.length],['Returnert',returned.length],['Til kontroll',pending.length]];
  if(missing.length)totals.push(['Mangler',missing.length]);
  const retired=jobReturns.units.filter(unit=>Object.hasOwn(reasons,unit.movement)).length;
  if(retired)totals.push(['Tatt ut av drift',retired]);
  if(transferred)totals.push(['Flyttet',transferred]);
  return '<section class="job-return-summary"><h2>Retur og avvik</h2><dl class="job-totals">'
    +totals.map(([label,count])=>'<div><dt>'+label+'</dt><dd>'+count+'</dd></div>').join('')+'</dl>'
    +(missing.length?'<h3>Mangler</h3><ul>'+missing.map(unit=>'<li>'+unitLabel(unit)+' '+button('Åpne møbel','item',unit.id)+'</li>').join('')+'</ul>':'')
    +(jobReturns.deviations.length?'<h3>Registrerte avvik</h3><ul>'+jobReturns.deviations.map(entry=>{
      const unit=jobReturns.units.find(candidate=>candidate.id===entry.item);
      return '<li>'+(unit?unitLabel(unit):escape(entry.item))+' · '+(entry.kind==='damage'?'Skadet':'Meldt savnet')+' · '+escape(entry.note)+'</li>';
    }).join('')+'</ul>':'')
    +'</section>'+(pending.length?'<form class="job-review" data-form="review-returns"><h3>Til returkontroll</h3><p>Kryss av enhetene som er i orden. Fyll inn en merknad for hver skadet enhet. Du kan lagre opptil 50 om gangen.</p>'+button('Velg inntil 50 uten merknad','select-returns')
      +pending.map(unit=>'<fieldset><legend>'+unitLabel(unit)+'</legend><label class="queue-choice"><input type="checkbox" name="approved" value="'+unit.id+'"> I orden</label><label>Skade eller mangel ved møbelet<input name="note-'+unit.id+'" maxlength="500"></label></fieldset>').join('')
      +submit('Lagre returkontroll')+'</form>':'')
    +(job.closed?'<p>Avsluttet '+escape(date(job.closed))+'</p>':assigned?'<p>Sjekk ut eller fjern de tillagte møblene før du avslutter.</p>':'<form class="job-review" data-form="close-job"><h3>Avslutt oppdrag</h3>'
      +(out.length?'<label>Merknad for møbler som fortsatt er ute<textarea name="note" required maxlength="500"></textarea></label><p>Ved avslutning registreres møbler som fortsatt er ute som savnet.</p>':'')
      +submit('Avslutt oppdrag')+'</form>');
}
function countLabel(p){return p?.pairedEnds?'Antall grunnsofaer (to etiketter per sofa)':'Antall nye eksemplarer';}
function countField(p){
  return '<label><span data-count-label>'+countLabel(p)+'</span><input name="count" type="number" inputmode="numeric" value="1" min="1" max="50" required></label>';
}
function batchForm(p){
  return '<form data-form="register"><input type="hidden" name="product" value="'+escape(p.id)+'">'+countField(p)+submit('Registrer og lag QR-etiketter')+'</form>';
}
function unusedCorrection(p){
  const unused=p.items.filter(i=>i.state==='held'&&i.revision===1).length;
  const withdrawn=(data.withdrawn||[]).filter(id=>id===p.id).length;
  if(!unused&&!withdrawn)return '';
  const form=(label,action,count)=>'<form data-form="correct-unused" data-expected="'+count+' " data-restore="'+(action==='Gjenopprett etiketter')+'">'
    +'<label>'+label+'<input type="number" name="count" min="1" max="'+Math.min(count,50)+'" value="1" required></label>'
    +submit(action)+'</form>';
  return '<details><summary>Korriger ubrukte QR-etiketter</summary>'
    +(unused?form('Antall ubrukte etiketter som skal trekkes tilbake','Trekk tilbake etiketter',unused):'')
    +(withdrawn?form('Antall etiketter som skal gjenopprettes','Gjenopprett etiketter',withdrawn):'')+'</details>';
}
const sheetCapacity=24;
let queue=new Set();
let queueSearch='';
let printedView=false;
const queueEligible=i=>pendingLabel(i)&&Boolean(i.labelPrinted)===printedView;
const labelBrand=p=>(p.brand||inferProductBrand(p)||'').trim();
const labelOrder=new Intl.Collator('nb',{sensitivity:'base',numeric:true});
function orderedLabelGroups(){
  return [...rows].sort((a,b)=>{
    const left=labelBrand(a),right=labelBrand(b);
    return Number(!left)-Number(!right)||labelOrder.compare(left,right)||labelOrder.compare(a.name,b.name)||a.id.localeCompare(b.id);
  });
}
const queueKey=()=>'ku-label-selection-v2:'+data.actor+':'+printedView;
const pendingLabel=i=>i.state==='held'&&Boolean(i.labelPending);
function pendingQueueItems(ids){
  const eligible=new Set(data.items.filter(queueEligible).map(i=>i.id));
  return [...ids].filter(id=>eligible.has(id));
}
function saveQueue(){
  try{sessionStorage.setItem(queueKey(),JSON.stringify([...queue]));}catch{}
}
function restoreQueue(){
  try{queue=new Set(pendingQueueItems(JSON.parse(sessionStorage.getItem(queueKey())||'[]')));}catch{queue=new Set();}
}
function queueView(){
  const groups=orderedLabelGroups().map(p=>({...p,items:p.items.filter(queueEligible)})).filter(p=>p.items.length);
  return '<h1>Samle etiketter</h1><p>Velg eksemplarer som venter på første innsjekking. Hvert ark har 24 plasser.</p>'
    +'<div class="actions">'+button('Ikke utskrevet','queue-mode','new',!printedView)+button('Utskrevet – venter på festing','queue-mode','printed',printedView)+'</div>'
    +'<label class="queue-search">Søk etter produkt eller etikett-ID<input type="search" data-queue-search value="'+escape(queueSearch)+'"></label>'
    +'<div class="actions"><strong id="queue-count" role="status"></strong>'+button('Velg alle viste','queue-select-all')+button('Nullstill valg','queue-clear')+button('Vis utskrift','queue-preview','',true)+'</div>'
    +groups.map((p,index)=>(index===0||labelBrand(groups[index-1])!==labelBrand(p)?'<h2 data-label-brand>'+escape(labelBrand(p)||'Uten merke')+'</h2>':'')+'<section data-queue-product="'+escape(foldProductSearch([p.name,p.brand].join(' ')))+'"><label class="queue-choice scan-identity"><input type="checkbox" data-group="'+escape(p.id)+'">'+photo(p)+'<strong>'+escape(p.name)+' · '+p.items.length+'</strong></label><details><summary>Velg enkelte eksemplarer</summary>'
      +p.items.map(i=>'<label class="queue-choice"><input type="checkbox" data-unit="'+escape(i.id)+'">'+escape(i.id)+' · '+escape(sideNames[i.side]||states[i.state])+'</label>').join('')+'</details></section>').join('')
    +(groups.length?'<p data-queue-empty hidden>Ingen produkter eller etiketter passer søket.</p>':(printedView?'<p>Ingen bekreftede utskrifter venter på festing.</p>':'<p>Ingen nye etiketter å skrive ut.</p>'));
}
function filterQueue(){
  const term=foldProductSearch(queueSearch);
  let hasMatches=false;
  for(const group of screen.querySelectorAll('[data-queue-product]')){
    const matches=group.dataset.queueProduct.includes(term)||[...group.querySelectorAll('[data-unit]')].some(unit=>unit.dataset.unit.toLowerCase().includes(term));
    group.hidden=!matches;
    hasMatches||=matches;
  }
  for(const heading of screen.querySelectorAll('[data-label-brand]')){
    let group=heading.nextElementSibling;
    heading.hidden=true;
    while(group?.hasAttribute('data-queue-product')){
      if(!group.hidden){heading.hidden=false;break;}
      group=group.nextElementSibling;
    }
  }
  const empty=screen.querySelector('[data-queue-empty]');
  if(empty)empty.hidden=hasMatches;
}
function updateQueue(){
  for(const box of screen.querySelectorAll('[data-unit]'))box.checked=queue.has(box.dataset.unit);
  for(const box of screen.querySelectorAll('[data-group]')){
    const items=rows.find(p=>p.id===box.dataset.group).items.filter(queueEligible);
    const count=items.filter(i=>queue.has(i.id)).length;
    box.checked=count===items.length;box.indeterminate=count>0&&!box.checked;
  }
  document.querySelector('#queue-count').textContent=queue.size+' valgt · '+Math.ceil(queue.size/sheetCapacity)+' ark';
  screen.querySelector('[data-action="queue-preview"]').disabled=!queue.size;
}
function sheets(ids){
  const result=[];
  const items=new Map(data.items.map(i=>[i.id,i]));
  const brands=new Map(rows.map(p=>[p.id,labelBrand(p)]));
  for(let start=0;start<ids.length;start+=sheetCapacity){
    const cells=ids.slice(start,start+sheetCapacity).map(id=>{
      const qr=window.qrcode(0,'M');qr.addData(location.origin+'/styling/index.html?item='+id);qr.make();
      const item=items.get(id),name=productName(item),brand=brands.get(item.product);
      const title=brand&&!foldProductSearch(name).includes(foldProductSearch(brand))?brand+' · '+name:name;
      return '<div class="label">'+qr.createSvgTag(4,16)+'<div><b>KONSEPTUELL</b><span>'+escape(title)+'</span><strong>'+escape(id)+'</strong></div></div>';
    });
    result.push('<div class="label-sheet">'+cells.join('')+'</div>');
  }
  return '<div class="labels">'+result.join('')+'</div>';
}
function render(){
  document.querySelector('.admin-shell').hidden=!isAdminView();
  document.querySelector('.styling-header').hidden=Boolean(isAdminView());
  nav.innerHTML='';
  stylistMenu.innerHTML='';
  let html='';
  if(!data){
    html=invitation?'<h1>Aktiver stylistkonto</h1><form data-form="claim"><label>Velg passord<input name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label>'+submit('Aktiver konto')+'</form>':'<h1>Logg inn som stylist</h1><form data-form="login"><label>E-post<input name="email" type="email" required autocomplete="username"></label><label>Passord<input name="password" type="password" required autocomplete="current-password"></label>'+submit('Logg inn')+'</form><a href="/admin/login?to=styling'+(itemPattern.test(itemId)?'&amp;item='+itemId:'')+'">Administratorinnlogging</a>';
  }else{
    if(!isAdminView()){
      if(['jobs','new','archive'].includes(page))nav.innerHTML=button('← Tilbake','stylist-home');
      if(page==='job')nav.innerHTML=button('← Til oppdragslisten',data.jobs.find(job=>job.id===jobId)?.closed?'archive':'jobs');
      const inJob=['job','scan-job','in','out'].includes(page)&&data.jobs.some(job=>job.id===jobId);
      stylistMenu.innerHTML='<details><summary aria-label="Meny"><span aria-hidden="true">☰</span> Meny</summary><div class="stylist-menu-options">'
        +button('Startside','stylist-home')+(inJob?button('Returkontroll og oppdrag','job',jobId):'')
        +button('Lager','stock')+button('Avsluttede oppdrag','archive')+(isPreview()?'<a class="button" href="/admin/">Til administrasjon</a>':button('Logg ut','logout'))+'</div></details>';
    }else{
      nav.innerHTML=button('Oppdrag','jobs')+button('Lager','stock')+button('Avsluttede oppdrag','archive')
        +button('Bruksstatistikk','usage')+button('Stylister','staff')+'<a href="/styling/index.html?visning=stylist" target="_blank" rel="noopener">Forhåndsvis stylistvisning</a>';
      const tab=['stock','register','labels','queue','counts','count','transition','retire-scan'].includes(page)||(page==='product'&&source==='stock')?'stock':
        ['usage','staff','archive'].includes(page)?page:'jobs';
      nav.querySelector('[data-action="'+tab+'"]')?.setAttribute('aria-current','page');
    }
    if(page==='stylist-home'){
      const options=[['Velg oppdrag','jobs'],['Nytt oppdrag','new']];
      html='<div class="styling-home stylist-start stylist-landing"><div class="styling-menu">'
        +options.map(([label,action],index)=>'<button type="button" class="button '+(index===0?'dark':'button-outline')
          +'" data-action="'+action+'"><span>'+label+'</span></button>').join('')+'</div></div>';
    }else if(page==='jobs'||page==='archive'){
      html='<div class="page-heading job-list-heading"><h1>'+(page==='jobs'?'Velg oppdrag':'Avsluttede oppdrag')+'</h1>'+(isAdminView()&&page==='jobs'?button('Nytt oppdrag','new','',true):'')+'</div>'
        +'<div class="filters jobs"><label>Søk etter navn eller adresse<input type="search" data-field="term" value="'+escape(jobFilter.term)+'"></label></div><div id="results"></div>';
    }else if(page==='new'){
      html='<h1>Nytt stylingoppdrag</h1><form data-form="job"><label>Navn eller adresse<input name="address" maxlength="200" required></label><p>Ansvarlig stylist · '+escape(data.actor)+'</p>'+submit('Opprett oppdrag')+'</form>';
    }else if(page==='job'){
      const job=data.jobs.find(j=>j.id===jobId);
      const items=data.items.filter(i=>i.job===jobId);
      if(!job){screen.innerHTML='<h1>Oppdraget finnes ikke lenger</h1>';return;}
      const assigned=items.filter(i=>i.state==='assigned');
      const out=items.filter(i=>i.state==='out');
      html='<div class="job-detail"><h1>'+escape(job.address)+'</h1>'
        +'<div class="actions job-scan-primary">'+button('Skann QR','start-job-scan','scan-job',true)+'</div>'
        +'<details><summary>Møbler på oppdraget · '+items.length+'</summary>'
        +items.map(listItem).join('')
        +'</details>'
        +'<details><summary>Flere valg</summary><div class="actions job-actions">'
          +(!job.closed?button('Registrer møbler','register')+(assigned.length?button('Sjekk ut alle ('+assigned.length+')','checkout-all'):'<button type="button" class="button button-outline" disabled>Sjekk ut alle</button>')
            +(assigned.length||out.length?button('Flytt til annen adresse','transfer-all'):'<button type="button" class="button button-outline" disabled>Flytt til annen adresse</button>')
            +(isAdminView()?button('Velg fra lager','pick'):''):'')
          +(isAdminView()&&items.length===0?button('Slett oppdrag','delete-job',jobId):'')+'</div>'+jobHistory()+'</details>'
        +returnOverview(job,out,assigned.length)+'</div>';
    }else if(page==='transfer-all'){
      const items=data.items.filter(i=>i.job===jobId&&['assigned','out'].includes(i.state));
      const outCount=items.filter(i=>i.state==='out').length;
      html=button('← Til oppdraget','job',jobId)+'<h1>Flytt til annen adresse</h1>'
        +'<p>Fra '+escape(jobName(jobId))+' · '+items.length+' møbler ('+outCount+' ute og '+(items.length-outCount)+' klargjort).</p>'
        +(items.length?'<form data-form="transfer-all" data-count="'+items.length+'" data-out-count="'+outCount+'"><label>Flytt til<select name="destination" required>'
          +'<option value="">Velg oppdrag</option>'+openJobs().filter(j=>j.id!==jobId).map(j=>'<option value="'+escape(j.id)+'">'+escape(j.address)+'</option>').join('')
          +'<option value="new">Opprett oppdrag på ny adresse</option></select></label>'
          +'<label hidden>Ny adresse<input name="address" maxlength="200" disabled></label>'+submit('Flytt alle møblene')+'</form>':'<p>Det er ingen møbler igjen å flytte.</p>');
    }else if(['in','out','scan-job'].includes(page)){
      const title=page==='in'?'Skann retur':page==='out'?'Skann ut':'Skann QR';
      html='<h1>'+title+'</h1><p>'+escape(jobName(jobId))+'</p>'
        +(page==='scan-job'?'<p>Skann for å legge møbelet på oppdraget. Skann samme etikett igjen for å returnere møbelet til lager.</p>':'')
        +'<div class="actions">'+button('Start kamera','camera','',true)+button('Til oppdraget','job',jobId)+'</div><video muted playsinline hidden></video><form data-form="scan"><label>Etikett-ID<input name="id" required autocomplete="off" autocapitalize="characters"></label>'+submit('Registrer ID')+'</form>'
        +(!isAdminView()?'<details class="scanner-items"><summary>Møbler på oppdraget</summary><div id="scannerItems"></div></details>':'');
    }else if(page==='stock'||page==='pick'){
      const picking=page==='pick';
      const toolsMenu=isAdminView()?'<details class="stock-tools"><summary class="button button-outline">Lagerverktøy</summary><div class="stock-tools-options">'
        +button('Varetelling','counts')+button('Status for QR-lager','transition')+button('Ta eksemplar ut av drift','retire-scan')+'</div></details>':'';
      html=(picking?button('← Til oppdraget','job',jobId):'')+'<div class="page-heading"><h1>'+(picking?'Velg fra lager':'Lagerbeholdning')+'</h1>'+(!picking?'<div class="actions stock-actions">'+toolsMenu+button('Samle etiketter','queue')+(isAdminView()?'<a class="button button-outline" href="/admin/?new=warehouse">Nytt produkt</a>':'')+button('Registrer møbler','register','',true)+'</div>':'')+'</div>'
         +(picking?'<p>'+escape(jobName(jobId))+'</p>':'')+stockControls(rows,activeFilter(),button)+'<div id="results"></div>';
    }else if(isAdminView()&&page==='transition'){
      html=button('← Til lageret','stock')+transitionTable(data.products,data.items,data.baselines);
    }else if(isAdminView()&&page==='counts'){
      const categories=new Map(data.products.filter(p=>p.rentalStock).map(p=>[p.categoryId,p.category]));
      const categoryName=id=>categories.get(id)||id||'Hele lageret';
      html=button('← Til lageret','stock')+'<h1>Varetelling</h1><form data-form="count-start"><label>Kategori<select name="category"><option value="">Hele lageret</option>'+[...categories].sort((a,b)=>a[1].localeCompare(b[1],'nb')).map(([id,name])=>'<option value="'+escape(id)+'">'+escape(name)+'</option>').join('')+'</select></label>'+submit('Start ny telling')+'</form><h2>Tellinger</h2>'+sessions.map(c=>'<p>'+button(categoryName(c.category)+' · '+date(c.started)+' · '+(c.closed?'Avsluttet':'Pågår'),'open-count',c.id)+'</p>').join('');
    }else if(isAdminView()&&page==='count'&&countSession){
      html=button('← Til tellinger','counts')+'<h1>Varetelling</h1><p>Forventet beholdning ved tellestart '+escape(date(countSession.started))+'. En observasjon endrer ingen lagerstatus.</p>'
        +(countSession.closed?'':scannerForm())+'<section id="countReport">'+countingReport(countSession,[...data.items,...data.retired],button)+'</section>'
        +(countSession.closed?'':button('Avslutt telling','count-close'));
    }else if(isAdminView()&&page==='retire-scan'){
      html=button('← Til lageret','stock')+'<h1>Ta eksemplar ut av drift</h1><p>Skann etiketten for å velge møbelet og bekrefte årsaken.</p>'+scannerForm();
    }else if(page==='product'){
      const p=rows.find(r=>r.id===productId);
      html=button(source==='pick'?'← Til produktvalget':'← Til lageret',source);
      if(p){
        html+='<div class="product-head">'+photo(p)+'<div><p>'+escape([p.category,p.subcategory].filter(Boolean).join(' · '))+'</p><h1>'+escape(p.name)+'</h1>'+(p.articleNumber?'<p>Artikkelnummer · '+escape(p.articleNumber)+'</p>':'')+'</div></div>'
          +'<div class="job-meta"><span>Ledige på lager<strong>'+p.available+' av '+p.items.length+' registrerte</strong></span><span>'+(p.qrStock?'Beholdning på Konseptuell.no (QR-lager)':'Manuelt antall på Konseptuell.no')+'<strong>'+escape(p.stock??'–')+'</strong></span></div>'
          +(source==='stock'&&data.products.some(entry=>entry.id===p.id)?batchForm(p)+(isAdminView()?unusedCorrection(p):''):'')
          +'<div class="list-heading"><h2>Eksemplarer</h2></div>'+p.items.map(i=>'<section class="record"><div><h2>'+escape(sideNames[i.side]||i.id)+'</h2><p>'+(i.side?escape(i.id)+' · ':'')+states[i.state]+' '+escape(jobName(i.job))+'</p></div><div class="actions">'+button(source==='pick'&&i.state==='ready'?'Velg eksemplar':'Åpne møbel','item',i.id)+(source==='stock'?button('Skriv ut etikett på nytt','label',i.id):'')+(p.pairedEnds&&!i.side&&i.state==='ready'?button('Del i to endemoduler','split',i.id):'')+'</div></section>').join('')
          +(!p.items.length?'<p>Ingen aktive QR-eksemplarer.</p>':'');
        const retired=data.retired.filter(i=>i.product===p.id);
        if(isAdminView()&&retired.length)html+='<details><summary>Tatt ut av drift · '+retired.length+'</summary>'+retired.map(i=>'<p>'+button(i.id+' · '+reasons[i.retiredReason],'item',i.id)+'</p>').join('')+'</details>';
      }
    }else if(page==='register'){
      html='<h1>Registrer møbler</h1><form data-form="register"><label>Produkt i katalogen<select name="product" required><option value="">Velg produkt</option>'+data.products.map(p=>'<option value="'+escape(p.id)+'" '+(p.id===selectedProduct?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></label>'+countField(data.products.find(p=>p.id===selectedProduct))+submit('Opprett eksemplarer og etiketter')+'</form>'+(isAdminView()?'<p><a href="/admin/?new=warehouse">Opprett nytt produkt og QR-etiketter</a></p>':'<p>Be en administrator opprette produktet hvis det mangler.</p>')+'';
    }else if(page==='queue'){
      html=queueView();
    }else if(page==='labels'){
      html='<h1>'+labels.length+(labels.length===1?' etikett':' etiketter')+'</h1><p>Hama 70 × 37 mm · A4 · 24 etiketter per ark. Skriv ut i 100 % størrelse uten topp- og bunntekst.</p><div class="actions">'+button('Skriv ut på A4','print','',true)+button('Bekreft utskrevet','confirm-printed')+button('Samle flere etiketter','extend-queue')+(jobId?button('Skann ut på oppdrag','out'):'')+'</div>'+sheets(labels);
    }else if(page==='item'){
      const i=item();html=i?'<h1>'+escape(productName(i))+'</h1><section><div class="scan-identity">'+itemPhoto(i)+'<div><h2>'+states[i.state]+'</h2><p>'+escape(i.id)+' '+escape(jobName(i.job))+'</p></div></div>'+button('Skriv ut etikett','label',i.id)+'</section>':'<h1>Ukjent etikett</h1>';
      if(itemOrigin==='product')html=button('← Til produktet','product',productId)+html;
      const holdButton=button('Hold tilbake','hold');
      if(i?.state==='ready'){
        const checkout=submit(source==='pick'&&itemOrigin==='product'?'Legg til på oppdrag':'Sjekk ut på oppdrag');
        html+=openJobs().length
          ? '<form data-form="checkout"><label>Stylingoppdrag<select name="job">'+jobOptions()+'</select></label><div class="actions">'+checkout+holdButton+'</div></form>'
          : '<div class="actions">'+button('Nytt stylingoppdrag','new')+holdButton+'</div>';
      }
      if(i?.state==='out')html+=button('Registrer retur','return');
      if(i&&['check','held'].includes(i.state))html+=button('Godkjenn for lager','ready');
      if(i?.state==='check')html+=holdButton;
      const retired=data.retired?.find(unit=>unit.id===itemId);
      if(retired)html='<h1>'+escape(productName(retired))+'</h1><p>'+escape(itemId)+' · Tatt ut av drift · '+escape(reasons[retired.retiredReason])+'</p>';
      if(i&&isAdminView())html+='<form data-form="retire"><label>Ta ut av drift<select name="reason" required><option value="">Velg årsak</option>'+Object.entries(reasons).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label>'+submit('Ta dette eksemplaret ut av drift')+'</form>';
      if(itemOrigin==='count'&&countSession)html+=button('← Til tellingen','open-count',countSession.id);
      if(i||retired)html+='<details><summary>Historikk</summary>'+history.map(h=>'<p>'+escape(date(h.created))+' · '+escape(historyLabels[h.state])+' · '+escape(h.actor)+' '+escape(jobName(h.job))+'</p>').join('')+'</details>';
    }else if(page==='usage'&&isAdminView()){
      html=usageView();
    }else if(page==='staff' && isAdminView()){
      html='<div class="page-heading"><h1>Stylister</h1></div><form data-form="invite"><label>Stylistens e-post<input type="email" name="email" required></label>'+submit('Send invitasjon')+'</form>';
      if(inviteUrl)html+='<label>Del med stylisten · gyldig i 24 timer<input readonly value="'+escape(inviteUrl)+'"></label>';
      html+='<div class="list-heading"><h2>Stylistkontoer <span class="count">'+data.staff.length+'</span></h2></div>'+data.staff.map(s=>'<section class="record"><div><h2>'+escape(s.email)+'</h2><p>'+(!s.active?'Deaktivert':s.registered?'Aktiv':'Invitert')+'</p></div><div class="actions">'
        +(!s.active?button('Aktiver og send invitasjon','resend-invite',s.email):!s.registered?button('Send ny invitasjon','resend-invite',s.email):'')
        +(s.active?button('Deaktiver','disable',s.email):'')+'</div></section>').join('');
    }
  }
  screen.innerHTML=(isPreview()?'<p class="stylist-preview">Forhåndsvisning som stylist. Registreringer lagres i det aktive lageret.</p>':'')+html;refreshResults();refreshScannerItems();if(data&&page==='queue'){updateQueue();filterQueue();}
}
function refreshResults(){
  const results=screen.querySelector('#results');if(!results||!data)return;
  results.innerHTML=['jobs','archive'].includes(page)?jobResults(page==='jobs'?openJobs():archivedJobs(),jobFilter,button):stockResults(rows,activeFilter(),button);
}
screen.oninput=e=>{
  if(e.target.id==='transitionSearch'){
    const term=foldProductSearch(e.target.value);
    for(const row of screen.querySelectorAll('#transitionRows tr'))row.hidden=!foldProductSearch(row.cells[0].textContent).includes(term);
    return;
  }
  if(e.target.matches('[data-queue-search]')){
    queueSearch=e.target.value;
    filterQueue();
    return;
  }
  if(e.target.name==='destination'&&e.target.form?.dataset.form==='transfer-all'){
    const address=e.target.form.elements.address;
    const create=e.target.value==='new';
    address.closest('label').hidden=!create;
    address.disabled=!create;
    address.required=create;
    return;
  }
  const usage=e.target.dataset.usage;
  if(usage){
    const value=e.target.value;
    run(async()=>{
      if(usage==='period'){usagePeriod=value;await loadUsage();}else usageOrder=value;
      render();screen.querySelector('[data-usage="'+usage+'"]').focus();
    });
    return;
  }
  if(e.target.matches('[data-group],[data-unit]')){
    const ids=e.target.dataset.group?rows.find(p=>p.id===e.target.dataset.group).items.filter(queueEligible).map(i=>i.id):[e.target.dataset.unit];
    for(const id of ids){if(e.target.checked)queue.add(id);else queue.delete(id);}
    saveQueue();
    updateQueue();return;
  }
  if(e.target.name==='product'&&e.target.form?.dataset.form==='register'){
    e.target.form.querySelector('[data-count-label]').textContent=countLabel(data.products.find(p=>p.id===e.target.value));
  }
  const key=e.target.dataset.field;if(!key)return;
  const f=activeFilter();f[key]=e.target.value;
  if(key==='category'){f.sub='';render();screen.querySelector('[data-field="category"]').focus();}
  else refreshResults();
};
async function move(i,action,job){
  await api('move',{id:i.id,revision:i.revision,action,job});await load();
}
function refreshScannerItems(){
  const list=screen.querySelector('#scannerItems');
  if(!list||!data)return;
  const items=data.items.filter(unit=>unit.job===jobId);
  list.parentElement.querySelector('summary').textContent='Møbler på oppdraget · '+items.length;
  list.innerHTML=items.length?'<ul>'+items.map(unit=>'<li><div class="scan-identity">'+itemPhoto(unit)+'<span>'+escape(productName(unit))+' · '+escape(states[unit.state])+'</span></div></li>').join('')+'</ul>':'<p>Ingen møbler lagt til ennå.</p>';
}
async function openScanner(mode){
  go(mode);
  if(navigator.mediaDevices?.getUserMedia)await camera();
}
function scannerForm(){
  return '<div class="actions">'+button('Start kamera','camera','',true)+'</div><video muted playsinline hidden></video><form data-form="scan"><label>Etikett-ID<input name="id" required autocomplete="off" autocapitalize="characters"></label>'+submit('Registrer ID')+'</form>';
}
async function scan(raw){
  let id=raw.trim().toUpperCase();
  if(!itemPattern.test(id)){try{const url=new URL(raw);if(url.origin===location.origin&&url.pathname==='/styling/index.html')id=url.searchParams.get('item');}catch{}}
  const i=data.items.find(i=>i.id===id);
  const retired=data.retired?.find(unit=>unit.id===id);
  if(retired)throw Error(productName(retired)+' er tatt ut av drift · '+reasons[retired.retiredReason]+'.');
  if(!i)throw Error('Ukjent etikett. Kontroller ID-en.');
  if(page==='retire-scan'){itemOrigin=page;return showItem(id);}
  if(page==='count'){
    const result=await api('count-scan',{id:countSession.id,item:id});
    if(!countSession.seen.includes(id))countSession.seen.push(id);
    screen.querySelector('#countReport').innerHTML=countingReport(countSession,[...data.items,...data.retired],button);
    status.textContent=productName(i)+(result.already?' · allerede telt':' · registrert i tellingen');return;
  }
  const request={id:i.id,revision:i.revision,job:jobId};
  let route='move',action=page==='scan-job'?'scan':page;
  if(page==='scan-job'&&i.job&&i.job!==jobId&&['assigned','out'].includes(i.state)){
    if(data.jobs.find(job=>job.id===jobId)?.closed)throw Error('Oppdraget er avsluttet.');
    if(!confirm(productName(i)+' står på «'+(jobName(i.job)||'et annet oppdrag')+'» med status «'+states[i.state]+'». Flytt hit til «'+jobName(jobId)+'»?')){
      status.textContent='Møbelet ble ikke flyttet.';
      return;
    }
    route='transfer';
    request.fromJob=i.job;
  }
  const result=await api(route,{...request,action});
  Object.assign(i,result,{revision:i.revision+1});
  rows=stockRows(data);
  refreshScannerItems();
  const resultLabel=route==='transfer'?'flyttet hit':({assigned:'lagt til på oppdraget',out:'lagt til på oppdraget',ready:'tilbake på lager',check:'retur registrert, venter på lagergodkjenning'}[result.state]||states[result.state]);
  status.innerHTML='<span class="scan-identity">'+itemPhoto(i)+'<span>'+escape(productName(i)+' · '+resultLabel)+'</span>'
    +(result.state==='ready'?button('Marker som skadet','report-damage',i.id):'')
    +(result.state==='check'?button('Åpne returkontroll','job',jobId):'')+'</span>';
}
async function camera(){
  stopCamera();const session=scanSession,video=screen.querySelector('video');
  const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  if(session!==scanSession){media.getTracks().forEach(t=>t.stop());return;}
  stream=media;video.srcObject=media;video.hidden=false;await video.play();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  let previous='',absentSince=0;
  async function frame(){
    if(session!==scanSession)return;
    try{
      if(video.readyState>=2&&!working&&!stylistMenu.querySelector("details[open]")){
        canvas.width=Math.min(video.videoWidth,720);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height),code=window.jsQR(img.data,img.width,img.height)?.data;
        if(code){
          absentSince=0;
          if(code!==previous){previous=code;await run(()=>scan(code));}
        }else{
          absentSince||=Date.now();
          if(Date.now()-absentSince>=1500)previous='';
        }
      }
    }finally{if(session===scanSession)setTimeout(frame,180);}
  }
  frame();
}
let pendingAdminPage='';
function openAdminPage(next){
  if(working){pendingAdminPage=next;return;}
  return run(async()=>{
    if(next==='usage')await loadUsage();
    go(next);
  });
}
function confirmStockAction(word,title,description){
  const dialog=document.createElement('dialog');
  dialog.className='stock-confirmation';
  dialog.setAttribute('aria-labelledby','stock-confirm-title');
  dialog.innerHTML='<form method="dialog"><h2 id="stock-confirm-title">'+escape(title)+'</h2><p>'+escape(description)+'</p>'
    +'<label>Skriv '+word+' for å bekrefte<input autofocus autocomplete="off" autocapitalize="characters"></label>'
    +'<div class="actions"><button type="button" class="button button-outline">Avbryt</button>'
    +'<button type="submit" class="button dark" disabled>Bekreft</button></div></form>';
  const input=dialog.querySelector('input'),confirmButton=dialog.querySelector('[type=submit]');
  input.oninput=()=>{confirmButton.disabled=input.value!==word;};
  dialog.querySelector('[type=button]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=e=>{
    e.preventDefault();
    if(input.value===word)dialog.close('confirmed');
  };
  document.body.append(dialog);
  dialog.showModal();
  return new Promise(resolve=>dialog.addEventListener('close',()=>{
    dialog.remove();
    resolve(dialog.returnValue==='confirmed');
  },{once:true}));
}
async function run(fn){
  if(working)return;working=true;
  try{await fn();}catch(e){
    if(e.status===401){stopCamera();data=null;render();}
    if(e.status===409){await load();refreshScannerItems();if(page==='job'&&data.jobs.some(job=>job.id===jobId))await loadJobReturns();if(!['in','out','scan-job'].includes(page))render();}
    status.textContent=e.name==='NotAllowedError'?'Kameratilgang mangler. Tillat kamera eller skriv inn etikett-ID.':e.message;
  }finally{
    working=false;
    const next=pendingAdminPage;
    pendingAdminPage='';
    if(next&&isAdminView())await openAdminPage(next);
  }
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  if(isAdminView()&&nav.contains(b)){openAdminPage(b.dataset.action);return;}
  run(async()=>{
    const action=b.dataset.action,value=b.dataset.value;
    if(action==='counts'){sessions=await api('counts');return go('counts');}
    if(action==='transition'){await load();return go('transition');}
    if(action==='open-count'){await load();countSession=await api('count/'+value);return go('count');}
    if(action==='count-close'){
      if(!confirm('Avslutt tellingen og lagre avvikene? Beholdningen endres ikke.'))return;
      await api('count-close',{id:countSession.id});countSession=await api('count/'+countSession.id);return go('count');
    }
    if(action==='delete-job'&&isAdminView()&&page==='job'&&jobId===value){
      if(!confirm('Slett oppdraget «'+jobName(value)+'»? Dette kan ikke angres.'))return;
      await api('delete-job',{id:value});
      await load();
      go('jobs');
      status.textContent='Oppdraget er slettet.';
      return;
    }
    if(action==='select-returns'){
      const form=b.closest('form');
      let remaining=50;
      for(const choice of form.querySelectorAll('input[name="approved"]')){
        choice.checked=remaining>0&&!form.elements.namedItem('note-'+choice.value).value.trim();
        if(choice.checked)remaining--;
      }
      return;
    }
    if(action==='reset-filters'){Object.assign(activeFilter(),page==='jobs'?jobDefaults:defaults);render();return;}
    if(action==='view'){activeFilter().view=value;refreshResults();return;}
    if(action==='product'){
      if(page==='stock'||page==='pick'){source=page;window.history.replaceState({styling:true,page,jobId},'');window.history.pushState({styling:true,page:'product',productId:value,source,jobId},'');}
      productId=value;return go('product');
    }
    if(action==='checkout-all'&&page==='job'){
      if(!confirm('Sjekk ut alle møblene på dette oppdraget som fortsatt venter på henting?'))return;
      const {count}=await api('checkout-all',{id:jobId});
      await load();await loadJobReturns();go('job');
      status.textContent=count+' møbler sjekket ut.';
      return;
    }
    if(action==='transfer-all'&&page==='job')return go('transfer-all');
    if(action==='unassign'&&page==='job'){
      await move(data.items.find(i=>i.id===value),'unassign',jobId);
      await loadJobReturns();return go('job');
    }
    if(action==='report-damage'){
      const unit=data.items.find(unit=>unit.id===value);
      const note=prompt('Beskriv skaden på '+productName(unit));
      if(!note?.trim())return;
      await api('review-returns',{id:jobId,units:[{id:value,revision:unit.revision,note:note.trim()}]});
      await load();
      if(page==='job'){await loadJobReturns();render();}
      status.textContent=productName(unit)+' · skaden er registrert og møbelet er holdt tilbake.';
      return;
    }
    if(action==='start-job-scan')return openScanner(value);
    if(action==='camera'){if(!navigator.mediaDevices?.getUserMedia)throw Error('Bruk etikett-ID eller åpne siden med HTTPS for kamera.');return camera();}
    if(action==='queue-select-all'||action==='queue-clear'){
      if(action==='queue-clear')queue.clear();
      else for(const box of screen.querySelectorAll('[data-queue-product]:not([hidden]) [data-unit]'))queue.add(box.dataset.unit);
      saveQueue();updateQueue();return;
    }
    if(action==='queue-mode'){
      printedView=value==='printed';restoreQueue();return go('queue');
    }
    if(action==='confirm-printed'){
      if(!confirm('Er alle '+labels.length+' etikettene i denne utskriften skrevet ut?'))return;
      await api('labels-printed',{ids:labels});await load();
      printedView=false;restoreQueue();saveQueue();go('queue');
      status.textContent=labels.length+' etiketter bekreftet utskrevet.';return;
    }
    if(action==='queue'||action==='extend-queue'){
      printedView=false;
      await load();
      restoreQueue();
      if(action==='extend-queue'){for(const id of pendingQueueItems(labels))queue.add(id);}
      saveQueue();
      return go('queue');
    }
    if(action==='queue-preview'){
      await load();
      queue=new Set(pendingQueueItems(queue));
      saveQueue();
      labels=orderedLabelGroups().flatMap(p=>p.items.filter(i=>queue.has(i.id)).map(i=>i.id));
      return go(labels.length?'labels':'queue');
    }
    if(action==='print')return window.print();
    if(action==='item'){itemOrigin=page;return showItem(value);}
    if(action==='split'){
      const unit=data.items.find(i=>i.id===value);
      if(!confirm('Del grunnsofaen i to? Den eksisterende etiketten blir venstre endemodul. Høyre ende får en ny etikett.'))return;
      labels=(await api('split',{id:value,revision:unit.revision})).ids;await load();return go('labels');
    }
    if(action==='label'){labels=[value];return go('labels');}
    if(action==='job'){
      jobId=value;await load();
      await loadJobReturns();
    }
    if(action==='hold'&&!await confirmStockAction('HOLD','Hold tilbake',productName(item())+' ('+itemId+'). Eksemplaret blir utilgjengelig for utleie.'))return;
    if(['ready','hold','return'].includes(action)){await move(item(),action==='return'?'in':action,item().job);return showItem(itemId);}
    if(action==='disable'){if(!confirm('Deaktiver tilgangen for '+value+'?'))return;await api('disable',{email:value});await load();inviteUrl='';return go('staff');}
    if(action==='resend-invite')return sendStylistInvite(value);
    if(action==='logout'){await api('logout',{});data=null;return go('home');}
    go(action);
  });
});
screen.onsubmit=e=>{
  e.preventDefault();const form=e.target,fields=Object.fromEntries(new FormData(form));
  run(async()=>{
    switch(form.dataset.form){
      case 'count-start':{
        const {id}=await api('count-start',{category:fields.category});countSession=await api('count/'+id);go('count');break;
      }
      case 'retire':{
        const unit=item(),reason=fields.reason;
        if(!unit||!Object.hasOwn(reasons,reason))return;
        if(!await confirmStockAction('UT','Ta ut av drift',productName(unit)+' ('+unit.id+') tas ut av drift som '+reasons[reason].toLowerCase()+'. '+(unit.job?'Enheten fjernes fra '+jobName(unit.job)+'. ':'')+'Beholdningen oppdateres og etiketten sperres.'))return;
        await api('retire',{id:unit.id,revision:unit.revision,reason});await load();await showItem(unit.id);break;
      }
      case 'claim':await api('claim',{invitation,password:fields.password});invitation=null;window.history.replaceState(null,'',location.pathname+location.search);render();status.textContent='Kontoen er aktiv. Logg inn med e-post og passord.';break;
      case 'login':await api('login',fields);await load();if(itemId)await showItem(itemId);else go(landingPage());break;
      case 'job':jobId=(await api('jobs',fields)).id;await load();await loadJobReturns();go('job');break;
      case 'draft':selectedProduct=(await api('draft',fields)).id;await load();go('register');status.textContent='Produktutkastet er valgt. Angi antall eksemplarer.';break;
      case 'register':labels=(await api('items',{product:fields.product,count:Number(fields.count)})).ids;await load();go('labels');break;
      case 'correct-unused':{
        const restore=form.dataset.restore==='true';
        const {count}=await api('correct-unused',{product:productId,count:Number(fields.count),expected:Number(form.dataset.expected),restore});
        await load();go('product');
        status.textContent=count+(restore?' etiketter gjenopprettet.':' etiketter trukket tilbake.');
        break;
      }
      case 'scan':await scan(fields.id);form.reset();break;
      case 'transfer-all':{
        const count=Number(form.dataset.count),outCount=Number(form.dataset.outCount);
        const create=fields.destination==='new';
        const address=create?fields.address.trim():jobName(fields.destination);
        if(!address)throw Error('Velg oppdraget eller oppgi den nye adressen.');
        if(!confirm('Flytt '+count+' møbler fra «'+jobName(jobId)+'» til «'+address+'»?'))return;
        const result=await api('transfer-all',{fromJob:jobId,count,outCount,...(create?{address}:{job:fields.destination})});
        jobId=result.job;
        await load();await loadJobReturns();go('job');
        status.textContent=result.count+' møbler flyttet til '+jobName(jobId)+'.';
        break;
      }
      case 'review-returns':{
        const approved=new Set(new FormData(form).getAll('approved'));
        const units=pendingReturns().flatMap(unit=>{
          const note=fields['note-'+unit.id]?.trim();
          return note||approved.has(unit.id)?[{id:unit.id,revision:unit.revision,...(note?{note}:{})}]:[];
        });
        if(!units.length||units.length>50)throw Error('Velg mellom 1 og 50 enheter om gangen.');
        await api('review-returns',{id:jobId,units});
        await load();await loadJobReturns();go('job');
        status.textContent='Returkontrollen er lagret.';
        break;
      }
      case 'close-job':
        if(!confirm('Avslutt dette oppdraget? Det stenges for nye utsjekkinger.'))return;
        await api('close-job',{id:jobId,note:fields.note||''});
        await load();await loadJobReturns();go('job');
        status.textContent='Oppdraget er avsluttet.';
        break;
      case 'checkout':await move(item(),source==='pick'&&itemOrigin==='product'?'assign':'out',fields.job);await showItem(itemId);break;
      case 'invite':{
        const email=fields.email.trim().toLowerCase();
        const replace=data.staff.some(s=>s.email===email&&s.active&&s.registered);
        if(replace&&!confirm('Erstatt eksisterende tilgang med en ny invitasjon?'))return;
        await sendStylistInvite(email,replace);
        break;
      }
    }
  });
};
window.addEventListener('popstate',e=>{
  if(!data||!e.state?.styling)return;
  jobId=e.state.jobId||jobId;productId=e.state.productId||productId;source=e.state.source||source;go(e.state.page);
});
if(invitation)render();else await run(async()=>{await load();const product=new URLSearchParams(location.search).get('labelsFor');if(itemId)await showItem(itemId);else if(product){labels=data.items.filter(i=>i.product===product&&pendingLabel(i)&&!i.labelPrinted).map(i=>i.id);if(labels.length)go('labels');else go('stock');}else if(isAdminView()&&new URLSearchParams(location.search).has('produkt')){
  productId=new URLSearchParams(location.search).get('produkt');
  if(rows.some(row=>row.id===productId))go('product');
  else {go('stock');status.textContent='Produktet finnes ikke i lageroversikten.';}
}else go(landingPage());});
