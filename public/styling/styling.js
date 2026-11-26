import {esc as escape,states,stockRows,stockControls,stockResults,jobResults,defaults,jobDefaults,photo} from './workspace.js?v=8';
const screen=document.querySelector('#screen'),nav=document.querySelector('#nav'),status=document.querySelector('#status'),stylistMenu=document.querySelector('#stylistMenu');
const historyLabels={...states,transferred:'Flyttet til annet oppdrag',unassigned:'Fjernet fra oppdrag'};
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
    const {mountAdminNavigation}=await import('/admin/navigation.js?v=2');
    const shell=document.querySelector('.admin-shell');
    const css=document.createElement('link');
    css.rel='stylesheet';
    css.href='/admin/navigation.css?v=3';
    const loaded=new Promise(resolve=>{css.onload=css.onerror=resolve;});
    document.head.append(css);
    await loaded;
    mountAdminNavigation(shell);
  }
}
function go(next){stopCamera();page=next;status.textContent='';render();}
async function showItem(id){
  itemId=id;history=await api('history/'+encodeURIComponent(id));go('item');
}
const openJobs=()=>data.jobs.filter(job=>!job.closed);
function jobOptions(){return openJobs().map(j=>'<option value="'+escape(j.id)+'" '+(j.id===jobId?'selected':'')+'>'+escape(j.address)+'</option>').join('');}
function listItem(i){return '<section><h2>'+escape(productName(i))+'</h2><p>'+escape(i.id)+' · '+states[i.state]+'</p>'+button('Åpne møbel','item',i.id)+'</section>';}
let jobReturns={units:[],deviations:[]};
async function loadJobReturns(){jobReturns=await api('job-returns/'+jobId);}
const pendingReturns=()=>jobReturns.units.filter(unit=>unit.movement==='check'&&unit.is_latest&&unit.state==='check');
function returnOverview(job,missing,assigned){
  const returned=jobReturns.units.filter(unit=>unit.movement==='check');
  const pending=pendingReturns();
  const transferred=jobReturns.units.filter(unit=>unit.movement==='transferred').length;
  const unitLabel=unit=>escape(productName(unit))+' · '+escape(unit.id);
  const totals=[['Skannet ut',jobReturns.units.length],['Returnert',returned.length],['Mangler',missing.length],['Til kontroll',pending.length]];
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
      +(missing.length?'<label>Merknad for møblene som mangler<textarea name="note" required maxlength="500"></textarea></label>':'')
      +submit('Avslutt oppdrag')+'</form>');
}
function countLabel(p){return p?.pairedEnds?'Antall grunnsofaer (to etiketter per sofa)':'Antall nye eksemplarer';}
function countField(p){
  return '<label><span data-count-label>'+countLabel(p)+'</span><input name="count" type="number" inputmode="numeric" value="1" min="1" max="50" required></label>';
}
function batchForm(p){
  return '<form data-form="register"><input type="hidden" name="product" value="'+escape(p.id)+'">'+countField(p)+submit('Registrer og lag QR-etiketter')+'</form>';
}
const sheetCapacity=24;
let queue=new Set();
const queueKey=()=>'ku-label-selection:'+data.actor;
function restoreQueue(){
  try{queue=new Set(JSON.parse(sessionStorage.getItem(queueKey())||'[]').filter(id=>data.items.some(i=>i.id===id)));}catch{queue=new Set();}
}
function queueView(){
  const groups=rows.filter(p=>p.items.length);
  return '<h1>Samle etiketter</h1><p>Velg registrerte møbler til samme utskrift. Hvert ark har 24 plasser.</p>'
    +'<div class="actions"><strong id="queue-count" role="status"></strong>'+button('Vis utskrift','queue-preview','',true)+'</div>'
    +groups.map(p=>'<section><label class="queue-choice"><input type="checkbox" data-group="'+escape(p.id)+'"><strong>'+escape(p.name)+' · '+p.items.length+'</strong></label><details><summary>Velg enkelte eksemplarer</summary>'
      +p.items.map(i=>'<label class="queue-choice"><input type="checkbox" data-unit="'+escape(i.id)+'">'+escape(i.id)+' · '+escape(sideNames[i.side]||states[i.state])+'</label>').join('')+'</details></section>').join('')
    +(!groups.length?'<p>Ingen registrerte eksemplarer ennå.</p>':'');
}
function updateQueue(){
  for(const box of screen.querySelectorAll('[data-unit]'))box.checked=queue.has(box.dataset.unit);
  for(const box of screen.querySelectorAll('[data-group]')){
    const items=rows.find(p=>p.id===box.dataset.group).items;
    const count=items.filter(i=>queue.has(i.id)).length;
    box.checked=count===items.length;box.indeterminate=count>0&&!box.checked;
  }
  document.querySelector('#queue-count').textContent=queue.size+' valgt · '+Math.ceil(queue.size/sheetCapacity)+' ark';
  screen.querySelector('[data-action="queue-preview"]').disabled=!queue.size;
}
function sheets(ids){
  const result=[];
  const items=new Map(data.items.map(i=>[i.id,i]));
  for(let start=0;start<ids.length;start+=sheetCapacity){
    const cells=ids.slice(start,start+sheetCapacity).map(id=>{
      const qr=window.qrcode(0,'M');qr.addData(location.origin+'/styling/index.html?item='+id);qr.make();
      return '<div class="label">'+qr.createSvgTag(4,16)+'<div><b>KONSEPTUELL</b><span>'+escape(productName(items.get(id)))+'</span><strong>'+escape(id)+'</strong></div></div>';
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
      const tab=['stock','register','labels','queue'].includes(page)||(page==='product'&&source==='stock')?'stock':
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
      const missing=items.filter(i=>i.state==='out');
      html='<div class="job-detail"><h1>'+escape(job.address)+'</h1>'
        +'<div class="actions job-scan-primary">'+button('Skann QR','start-job-scan','scan-job',true)+'</div>'
        +'<details><summary>Møbler på oppdraget · '+items.length+'</summary>'
        +items.map(unit=>listItem(unit)+(unit.state==='assigned'?button('Fjern fra oppdraget','unassign',unit.id):'')).join('')
        +'</details>'
        +(!job.closed||isAdminView()&&items.length===0?'<details><summary>Flere valg</summary><div class="actions job-actions">'
          +(!job.closed?button('Registrer møbler','register')+(assigned.length?button('Sjekk ut alle ('+assigned.length+')','checkout-all'):'<button type="button" class="button button-outline" disabled>Sjekk ut alle</button>')+(isAdminView()?button('Velg fra lager','pick'):''):'')
          +(isAdminView()&&items.length===0?button('Slett oppdrag','delete-job',jobId):'')+'</div></details>':'')
        +returnOverview(job,missing,assigned.length)+'</div>';
    }else if(['in','out','scan-job'].includes(page)){
      const title=page==='in'?'Skann retur':page==='out'?'Skann ut':'Skann QR';
      html='<h1>'+title+'</h1><p>'+escape(jobName(jobId))+'</p>'
        +(page==='scan-job'?'<p>Skann ved pakking, henting eller retur.</p>':'')
        +'<div class="actions">'+button('Start kamera','camera','',true)+button('Til oppdraget','job',jobId)+'</div><video muted playsinline hidden></video><form data-form="scan"><label>Etikett-ID<input name="id" required autocomplete="off" autocapitalize="characters"></label>'+submit('Registrer ID')+'</form>'
        +(!isAdminView()?'<details class="scanner-items"><summary>Møbler på oppdraget</summary><div id="scannerItems"></div></details>':'');
    }else if(page==='stock'||page==='pick'){
      const picking=page==='pick';
      html=(picking?button('← Til oppdraget','job',jobId):'')+'<div class="page-heading"><h1>'+(picking?'Velg fra lager':'Lagerbeholdning')+'</h1>'+(!picking?'<div class="actions stock-actions">'+button('Samle etiketter','queue')+(isAdminView()?'<a class="button button-outline" href="/admin/?new=warehouse">Nytt produkt</a>':'')+button('Registrer møbler','register','',true)+'</div>':'')+'</div>'
         +(picking?'<p>'+escape(jobName(jobId))+'</p>':'')+stockControls(rows,activeFilter(),button)+'<div id="results"></div>';
    }else if(page==='product'){
      const p=rows.find(r=>r.id===productId);
      html=button(source==='pick'?'← Til produktvalget':'← Til lageret',source);
      if(p){
        html+='<div class="product-head">'+photo(p)+'<div><p>'+escape([p.category,p.subcategory].filter(Boolean).join(' · '))+'</p><h1>'+escape(p.name)+'</h1>'+(p.articleNumber?'<p>Artikkelnummer · '+escape(p.articleNumber)+'</p>':'')+'</div></div>'
          +'<div class="job-meta"><span>Ledige på lager<strong>'+p.available+' av '+p.items.length+' registrerte</strong></span><span>'+(p.qrStock?'Beholdning på Konseptuell.no (QR-lager)':'Manuelt antall på Konseptuell.no')+'<strong>'+escape(p.stock??'–')+'</strong></span></div>'
          +(source==='stock'&&data.products.some(entry=>entry.id===p.id)?batchForm(p):'')
          +'<div class="list-heading"><h2>Eksemplarer</h2></div>'+p.items.map(i=>'<section class="record"><div><h2>'+escape(sideNames[i.side]||i.id)+'</h2><p>'+(i.side?escape(i.id)+' · ':'')+states[i.state]+' '+escape(jobName(i.job))+'</p></div><div class="actions">'+button(source==='pick'&&i.state==='ready'?'Velg eksemplar':'Åpne møbel','item',i.id)+(source==='stock'?button('Skriv ut etikett på nytt','label',i.id):'')+(p.pairedEnds&&!i.side&&i.state==='ready'?button('Del i to endemoduler','split',i.id):'')+'</div></section>').join('')
          +(!p.items.length?'<p>Ingen QR-registrerte eksemplarer.</p>':'');
      }
    }else if(page==='register'){
      html='<h1>Registrer møbler</h1><form data-form="register"><label>Produkt i katalogen<select name="product" required><option value="">Velg produkt</option>'+data.products.map(p=>'<option value="'+escape(p.id)+'" '+(p.id===selectedProduct?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></label>'+countField(data.products.find(p=>p.id===selectedProduct))+submit('Opprett eksemplarer og etiketter')+'</form>'+(isAdminView()?'<p><a href="/admin/?new=warehouse">Opprett nytt produkt og QR-etiketter</a></p>':'<p>Be en administrator opprette produktet hvis det mangler.</p>')+'';
    }else if(page==='queue'){
      html=queueView();
    }else if(page==='labels'){
      html='<h1>'+labels.length+(labels.length===1?' etikett':' etiketter')+'</h1><p>Hama 70 × 37 mm · A4 · 24 etiketter per ark. Skriv ut i 100 % størrelse uten topp- og bunntekst.</p><div class="actions">'+button('Skriv ut på A4','print','',true)+button('Samle flere etiketter','extend-queue')+(jobId?button('Skann ut på oppdrag','out'):'')+'</div>'+sheets(labels);
    }else if(page==='item'){
      const i=item();html=i?'<h1>'+escape(productName(i))+'</h1><section><h2>'+states[i.state]+'</h2><p>'+escape(i.id)+' '+escape(jobName(i.job))+'</p>'+button('Skriv ut etikett','label',i.id)+'</section>':'<h1>Ukjent etikett</h1>';
      if(itemOrigin==='product')html=button('← Til produktet','product',productId)+html;
      if(i?.state==='ready')html+=openJobs().length?'<form data-form="checkout"><label>Stylingoppdrag<select name="job">'+jobOptions()+'</select></label>'+submit(source==='pick'&&itemOrigin==='product'?'Legg til på oppdrag':'Sjekk ut på oppdrag')+'</form>':button('Nytt stylingoppdrag','new');
      if(i?.state==='out')html+=button('Registrer retur','return');
      if(i&&['check','held'].includes(i.state))html+=button('Godkjenn for lager','ready');
      if(i&&['check','ready'].includes(i.state))html+=button('Hold tilbake','hold');
      if(i)html+='<details><summary>Historikk</summary>'+history.map(h=>'<p>'+escape(date(h.created))+' · '+escape(historyLabels[h.state])+' · '+escape(h.actor)+' '+escape(jobName(h.job))+'</p>').join('')+'</details>';
    }else if(page==='usage'&&isAdminView()){
      html=usageView();
    }else if(page==='staff' && isAdminView()){
      html='<div class="page-heading"><h1>Stylister</h1></div><form data-form="invite"><label>Stylistens e-post<input type="email" name="email" required></label>'+submit('Lag invitasjonslenke')+'</form>';
      if(inviteUrl)html+='<label>Del med stylisten · gyldig i 24 timer<input readonly value="'+escape(inviteUrl)+'"></label>';
      html+='<div class="list-heading"><h2>Stylistkontoer <span class="count">'+data.staff.length+'</span></h2></div>'+data.staff.map(s=>'<section class="record"><div><h2>'+escape(s.email)+'</h2><p>'+(!s.active?'Deaktivert':s.registered?'Aktiv':'Invitert')+'</p></div>'+(s.active?button('Deaktiver','disable',s.email):'')+'</section>').join('');
    }
  }
  screen.innerHTML=(isPreview()?'<p class="stylist-preview">Forhåndsvisning som stylist. Registreringer lagres i det aktive lageret.</p>':'')+html;refreshResults();refreshScannerItems();if(data&&page==='queue')updateQueue();
}
function refreshResults(){
  const results=screen.querySelector('#results');if(!results||!data)return;
  results.innerHTML=['jobs','archive'].includes(page)?jobResults(page==='jobs'?openJobs():archivedJobs(),jobFilter,button):stockResults(rows,activeFilter(),button);
}
screen.oninput=e=>{
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
    const ids=e.target.dataset.group?rows.find(p=>p.id===e.target.dataset.group).items.map(i=>i.id):[e.target.dataset.unit];
    for(const id of ids){if(e.target.checked)queue.add(id);else queue.delete(id);}
    try{sessionStorage.setItem(queueKey(),JSON.stringify([...queue]));}catch{}
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
  list.innerHTML=items.length?'<ul>'+items.map(unit=>'<li>'+escape(productName(unit))+' · '+escape(states[unit.state])+'</li>').join('')+'</ul>':'<p>Ingen møbler lagt til ennå.</p>';
}
async function openScanner(mode){
  go(mode);
  if(navigator.mediaDevices?.getUserMedia)await camera();
}
async function scan(raw){
  let id=raw.trim().toUpperCase();
  if(!itemPattern.test(id)){try{const url=new URL(raw);if(url.origin===location.origin&&url.pathname==='/styling/index.html')id=url.searchParams.get('item');}catch{}}
  const i=data.items.find(i=>i.id===id);
  if(!i)throw Error('Ukjent etikett. Kontroller ID-en.');
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
  }else if(page==='scan-job'&&i.job===jobId&&i.state==='out'){
    if(!confirm('Bekreft retur av '+productName(i)+' til kontroll.')){
      status.textContent='Retur ble ikke registrert.';
      return;
    }
    action='in';
  }
  const result=await api(route,{...request,action});
  Object.assign(i,result,{revision:i.revision+1});
  rows=stockRows(data);
  refreshScannerItems();
  status.textContent=productName(i)+' · '+(route==='transfer'?'flyttet hit':({assigned:'lagt til på oppdraget',out:'skannet ut',check:'returnert til kontroll'}[result.state]));
}
async function camera(){
  stopCamera();const session=scanSession,video=screen.querySelector('video');
  const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
  if(session!==scanSession){media.getTracks().forEach(t=>t.stop());return;}
  stream=media;video.srcObject=media;video.hidden=false;await video.play();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  let previous='',lastSeen=0;
  async function frame(){
    if(session!==scanSession)return;
    try{
      if(video.readyState>=2&&!working&&!stylistMenu.querySelector("details[open]")){
        canvas.width=Math.min(video.videoWidth,720);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height),code=window.jsQR(img.data,img.width,img.height)?.data;
        if(code){const repeat=previous===code&&Date.now()-lastSeen<1500;previous=code;lastSeen=Date.now();if(!repeat){await run(()=>scan(code));lastSeen=Date.now();}}
      }
    }finally{if(session===scanSession)setTimeout(frame,180);}
  }
  frame();
}
async function run(fn){
  if(working)return;working=true;
  try{await fn();}catch(e){
    if(e.status===401){stopCamera();data=null;render();}
    if(e.status===409){await load();refreshScannerItems();if(page==='job'&&data.jobs.some(job=>job.id===jobId))await loadJobReturns();if(!['in','out','scan-job'].includes(page))render();}
    status.textContent=e.name==='NotAllowedError'?'Kameratilgang mangler. Tillat kamera eller skriv inn etikett-ID.':e.message;
  }finally{working=false;}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  run(async()=>{
    const action=b.dataset.action,value=b.dataset.value;
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
    if(action==='usage'&&isAdminView()){await loadUsage();return go('usage');}
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
    if(action==='unassign'&&page==='job'){
      await move(data.items.find(i=>i.id===value),'unassign',jobId);
      await loadJobReturns();return go('job');
    }
    if(action==='start-job-scan')return openScanner(value);
    if(action==='camera'){if(!navigator.mediaDevices?.getUserMedia)throw Error('Bruk etikett-ID eller åpne siden med HTTPS for kamera.');return camera();}
    if(action==='queue'||action==='extend-queue'){
      restoreQueue();
      if(action==='extend-queue'){for(const id of labels)queue.add(id);try{sessionStorage.setItem(queueKey(),JSON.stringify([...queue]));}catch{}}
      return go('queue');
    }
    if(action==='queue-preview'){labels=[...queue];return go('labels');}
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
    if(['ready','hold','return'].includes(action)){await move(item(),action==='return'?'in':action,item().job);return showItem(itemId);}
    if(action==='disable'){if(!confirm('Deaktiver tilgangen for '+value+'?'))return;await api('disable',{email:value});await load();inviteUrl='';return go('staff');}
    if(action==='logout'){await api('logout',{});data=null;return go('home');}
    go(action);
  });
});
screen.onsubmit=e=>{
  e.preventDefault();const form=e.target,fields=Object.fromEntries(new FormData(form));
  run(async()=>{
    switch(form.dataset.form){
      case 'claim':await api('claim',{invitation,password:fields.password});invitation=null;window.history.replaceState(null,'',location.pathname+location.search);render();status.textContent='Kontoen er aktiv. Logg inn med e-post og passord.';break;
      case 'login':await api('login',fields);await load();if(itemId)await showItem(itemId);else go(landingPage());break;
      case 'job':jobId=(await api('jobs',fields)).id;await load();await loadJobReturns();go('job');break;
      case 'draft':selectedProduct=(await api('draft',fields)).id;await load();go('register');status.textContent='Produktutkastet er valgt. Angi antall eksemplarer.';break;
      case 'register':labels=(await api('items',{product:fields.product,count:Number(fields.count)})).ids;await load();go('labels');break;
      case 'scan':await scan(fields.id);form.reset();break;
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
      case 'invite':if(data.staff.some(s=>s.email===fields.email.trim().toLowerCase()&&s.active)&&!confirm('Erstatt eksisterende tilgang med en ny invitasjon?'))return;inviteUrl=(await api('invite',fields)).url;await load();go('staff');break;
    }
  });
};
window.addEventListener('popstate',e=>{
  if(!data||!e.state?.styling)return;
  jobId=e.state.jobId||jobId;productId=e.state.productId||productId;source=e.state.source||source;go(e.state.page);
});
if(invitation)render();else await run(async()=>{await load();const product=new URLSearchParams(location.search).get('labelsFor');if(itemId)await showItem(itemId);else if(product){labels=data.items.filter(i=>i.product===product).map(i=>i.id);if(labels.length)go('labels');else go('stock');}else go(landingPage());});
