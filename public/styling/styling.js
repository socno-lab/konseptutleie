import {esc as escape,states,stockRows,stockControls,stockResults,jobControls,jobResults,defaults,jobDefaults,photo} from './workspace.js?v=2';
const screen=document.querySelector('#screen'),nav=document.querySelector('#nav'),status=document.querySelector('#status');
const itemPattern=/^K-[0-9A-F]{16}$/;
const button=(label,action,value='',primary=false)=>'<button type="button" class="button '+(primary?'dark':'button-outline')+'" data-action="'+action+'" data-value="'+escape(value)+'">'+escape(label)+'</button>';
const submit=label=>'<button class="button dark">'+label+'</button>';
const params=new URLSearchParams(location.hash.slice(1));
let invitation=params.get('invite'),itemId=new URLSearchParams(location.search).get('item'),page=itemId?'item':'jobs';
let data,jobId='',labels=[],selectedProduct='',history=[],inviteUrl='',stream,scanSession=0,working=false;
const item=()=>data.items.find(i=>i.id===itemId);
const jobName=id=>data.jobs.find(j=>j.id===id)?.address||'';
const sideNames={left:'Venstre endemodul',right:'Høyre endemodul'};
function productName(i){
  const name=data.products.find(p=>p.id===i.product)?.name||i.name;
  return i.side?name.replace(/grunnsofa med begge ender/i,'').replace(/–\s*,/g,',').replace(/\s+,/g,',')+' · '+sideNames[i.side]:name;
}
const date=t=>new Date(Number(t)).toLocaleString('nb-NO');
const stockFilter={...defaults},pickFilter={...defaults},jobFilter={...jobDefaults};
let source='stock',productId='',itemOrigin='',rows=[];
function activeFilter(){return page==='jobs'?jobFilter:page==='pick'?pickFilter:stockFilter;}
function stopCamera(){scanSession++;stream?.getTracks().forEach(track=>track.stop());stream=null;}
window.addEventListener('pagehide',stopCamera);
async function api(route,body){
  const response=await fetch('/api/styling/'+route,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw Object.assign(Error(result.error||'Kunne ikke kontakte lageret.'),{status:response.status});
  return result;
}
async function load(){data=await api('overview');rows=stockRows(data);}
function go(next){stopCamera();page=next;status.textContent='';render();}
async function showItem(id){
  itemId=id;history=await api('history/'+encodeURIComponent(id));go('item');
}
function jobOptions(){return data.jobs.map(j=>'<option value="'+escape(j.id)+'" '+(j.id===jobId?'selected':'')+'>'+escape(j.address)+'</option>').join('');}
function listItem(i){return '<section><h2>'+escape(productName(i))+'</h2><p>'+escape(i.id)+' · '+states[i.state]+'</p>'+button('Åpne møbel','item',i.id)+'</section>';}
function countLabel(p){return p?.pairedEnds?'Antall grunnsofaer (to etiketter per sofa)':'Antall nye eksemplarer';}
function countField(p){
  return '<label><span data-count-label>'+countLabel(p)+'</span><input name="count" type="number" inputmode="numeric" value="1" min="1" max="50" required></label>';
}
function batchForm(p){
  return '<form data-form="register"><input type="hidden" name="product" value="'+escape(p.id)+'">'+countField(p)+submit('Registrer og lag QR-etiketter')+'</form>';
}
function render(){
  nav.innerHTML='';let html='';
  if(!data){
    html=invitation?'<h1>Aktiver stylistkonto</h1><form data-form="claim"><label>Velg passord<input name="password" type="password" minlength="12" maxlength="128" required autocomplete="new-password"></label>'+submit('Aktiver konto')+'</form>':'<h1>Logg inn som stylist</h1><form data-form="login"><label>E-post<input name="email" type="email" required autocomplete="username"></label><label>Passord<input name="password" type="password" required autocomplete="current-password"></label>'+submit('Logg inn')+'</form><a href="/admin/login?to=styling'+(itemPattern.test(itemId)?'&amp;item='+itemId:'')+'">Administratorinnlogging</a>';
  }else{
    nav.innerHTML=button('Oppdrag','jobs')+button('Lager','stock')+(data.admin?button('Stylister','staff')+'<a href="/admin/">Administrasjon</a>':button('Logg ut','logout'));
    const tab=page==='staff'?'staff':(['stock','register','labels'].includes(page)||(page==='product' && source==='stock'))?'stock':'jobs';
    nav.querySelector('[data-action="'+tab+'"]')?.setAttribute('aria-current','page');
    if(page==='jobs'){
      html='<div class="page-heading"><h1>Stylingoppdrag</h1>'+button('Nytt stylingoppdrag','new','',true)+'</div>'+jobControls(data.jobs,jobFilter,button)+'<div id="results"></div>';
    }else if(page==='new'){
      html='<h1>Nytt stylingoppdrag</h1><form data-form="job"><label>Adresse<input name="address" maxlength="200" required></label><p>Ansvarlig stylist · '+escape(data.actor)+'</p>'+submit('Opprett oppdrag')+'</form>';
    }else if(page==='job'){
      const items=data.items.filter(i=>i.job===jobId);
      html='<h1>'+escape(jobName(jobId))+'</h1><div class="job-meta"><span>Stylist<strong>'+escape(data.jobs.find(j=>j.id===jobId)?.stylist)+'</strong></span><span>Opprettet<strong>'+escape(date(data.jobs.find(j=>j.id===jobId)?.created))+'</strong></span></div><div class="actions">'+button('Skann ut','out','',true)+button('Skann inn','in')+button('Velg fra lager','pick')+button('Registrer møbler','register')+'</div><h2>På oppdraget · '+items.length+'</h2>'+items.map(listItem).join('');
    }else if(page==='in'||page==='out'){
      html='<h1>'+ (page==='in'?'Skann inn':'Skann ut')+'</h1><p>'+escape(jobName(jobId))+'</p><div class="actions">'+button('Start kamera','camera','',true)+button('Til oppdraget','job',jobId)+'</div><video muted playsinline hidden></video><form data-form="scan"><label>Etikett-ID<input name="id" required autocomplete="off" autocapitalize="characters"></label>'+submit('Registrer ID')+'</form>';
    }else if(page==='stock'||page==='pick'){
      const picking=page==='pick';
      html=(picking?button('← Til oppdraget','job',jobId):'')+'<div class="page-heading"><h1>'+(picking?'Velg fra lager':'Lagerbeholdning')+'</h1>'+(!picking?button('Registrer møbler','register','',true):'')+'</div>'
        +(!picking&&data.admin?'<p><a href="/admin/">Opprett katalogprodukt</a></p>':'')+(picking?'<p>'+escape(jobName(jobId))+'</p>':'')+stockControls(rows,activeFilter(),button)+'<div id="results"></div>';
    }else if(page==='product'){
      const p=rows.find(r=>r.id===productId);
      html=button(source==='pick'?'← Til produktvalget':'← Til lageret',source);
      if(p){
        html+='<div class="product-head">'+photo(p)+'<div><p>'+escape([p.category,p.subcategory].filter(Boolean).join(' · '))+'</p><h1>'+escape(p.name)+'</h1>'+(p.articleNumber?'<p>Artikkelnummer · '+escape(p.articleNumber)+'</p>':'')+'</div></div>'
          +'<div class="job-meta"><span>Ledige på lager<strong>'+p.available+' av '+p.items.length+' registrerte</strong></span><span>Manuelt antall på Konseptuell.no<strong>'+escape(p.stock??'–')+'</strong></span></div>'
          +(source==='stock'&&data.products.some(entry=>entry.id===p.id)?batchForm(p):'')
          +'<div class="list-heading"><h2>Eksemplarer</h2></div>'+p.items.map(i=>'<section class="record"><div><h2>'+escape(sideNames[i.side]||i.id)+'</h2><p>'+(i.side?escape(i.id)+' · ':'')+states[i.state]+' '+escape(jobName(i.job))+'</p></div><div class="actions">'+button(source==='pick'&&i.state==='ready'?'Velg eksemplar':'Åpne møbel','item',i.id)+(source==='stock'?button('Skriv ut etikett på nytt','label',i.id):'')+(p.pairedEnds&&!i.side&&i.state==='ready'?button('Del i to endemoduler','split',i.id):'')+'</div></section>').join('')
          +(!p.items.length?'<p>Ingen QR-registrerte eksemplarer.</p>':'');
      }
    }else if(page==='register'){
      html='<h1>Registrer møbler</h1><form data-form="register"><label>Produkt i katalogen<select name="product" required><option value="">Velg produkt</option>'+data.products.map(p=>'<option value="'+escape(p.id)+'" '+(p.id===selectedProduct?'selected':'')+'>'+escape(p.name)+'</option>').join('')+'</select></label>'+countField(data.products.find(p=>p.id===selectedProduct))+submit('Opprett eksemplarer og etiketter')+'</form><details><summary>Produktet mangler i katalogen</summary><form data-form="draft"><label>Produktnavn<input name="name" maxlength="100" required></label><label>Leverandørens artikkelnummer (valgfritt)<input type="text" maxlength="80" spellcheck="false" name="articleNumber"></label><p>Admin fullfører pris, bilde og antall før publisering.</p>'+submit('Opprett produktutkast')+'</form></details>';
    }else if(page==='labels'){
      html='<h1>'+labels.length+(labels.length===1?' etikett':' etiketter')+'</h1><div class="actions">'+button('Skriv ut på A4','print','',true)+(jobId?button('Skann ut på oppdrag','out'):'')+'</div><div class="labels">'+labels.map(id=>{
        const qr=window.qrcode(0,'M');qr.addData(location.origin+'/styling/index.html?item='+id);qr.make();
        return '<div class="label"><b>KONSEPTUELL</b>'+qr.createSvgTag(4,16)+'<span>'+escape(productName(data.items.find(i=>i.id===id)))+'</span><strong>'+id+'</strong></div>';
      }).join('')+'</div>';
    }else if(page==='item'){
      const i=item();html=i?'<h1>'+escape(productName(i))+'</h1><section><h2>'+states[i.state]+'</h2><p>'+escape(i.id)+' '+escape(jobName(i.job))+'</p>'+button('Skriv ut etikett','label',i.id)+'</section>':'<h1>Ukjent etikett</h1>';
      if(itemOrigin==='product')html=button('← Til produktet','product',productId)+html;
      if(i?.state==='ready')html+=data.jobs.length?'<form data-form="checkout"><label>Stylingoppdrag<select name="job">'+jobOptions()+'</select></label>'+submit('Sjekk ut på oppdrag')+'</form>':button('Nytt stylingoppdrag','new');
      if(i?.state==='out')html+=button('Registrer retur','return');
      if(i&&['check','held'].includes(i.state))html+=button('Godkjenn for lager','ready');
      if(i&&['check','ready'].includes(i.state))html+=button('Hold tilbake','hold');
      if(i)html+='<details><summary>Historikk</summary>'+history.map(h=>'<p>'+escape(date(h.created))+' · '+states[h.state]+' · '+escape(h.actor)+' '+escape(jobName(h.job))+'</p>').join('')+'</details>';
    }else if(page==='staff' && data.admin){
      html='<div class="page-heading"><h1>Stylister</h1></div><form data-form="invite"><label>Stylistens e-post<input type="email" name="email" required></label>'+submit('Lag invitasjonslenke')+'</form>';
      if(inviteUrl)html+='<label>Del med stylisten · gyldig i 24 timer<input readonly value="'+escape(inviteUrl)+'"></label>';
      html+='<div class="list-heading"><h2>Stylistkontoer <span class="count">'+data.staff.length+'</span></h2></div>'+data.staff.map(s=>'<section class="record"><div><h2>'+escape(s.email)+'</h2><p>'+(!s.active?'Deaktivert':s.registered?'Aktiv':'Invitert')+'</p></div>'+(s.active?button('Deaktiver','disable',s.email):'')+'</section>').join('');
    }
  }
  screen.innerHTML=html;refreshResults();
}
function refreshResults(){
  const results=screen.querySelector('#results');if(!results||!data)return;
  results.innerHTML=page==='jobs'?jobResults(data.jobs,jobFilter,button):stockResults(rows,activeFilter(),button);
}
screen.oninput=e=>{
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
async function scan(raw){
  let id=raw.trim().toUpperCase();
  if(!itemPattern.test(id)){try{const url=new URL(raw);if(url.origin===location.origin&&url.pathname==='/styling/index.html')id=url.searchParams.get('item');}catch{}}
  const i=data.items.find(i=>i.id===id);
  if(!i)throw Error('Ukjent etikett. Kontroller ID-en.');
  await move(i,page,jobId);status.textContent=productName(i)+' · '+(page==='out'?'skannet ut':'returnert til kontroll');
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
      if(video.readyState>=2&&!working){
        canvas.width=Math.min(video.videoWidth,720);canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth);
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const img=ctx.getImageData(0,0,canvas.width,canvas.height),code=window.jsQR(img.data,img.width,img.height)?.data;
        if(code){const repeat=previous===code&&Date.now()-lastSeen<1500;previous=code;lastSeen=Date.now();if(!repeat)await run(()=>scan(code));}
      }
    }finally{if(session===scanSession)setTimeout(frame,180);}
  }
  frame();
}
async function run(fn){
  if(working)return;working=true;
  try{await fn();}catch(e){
    if(e.status===401){stopCamera();data=null;render();}
    if(e.status===409){await load();if(page!=='in'&&page!=='out')render();}
    status.textContent=e.name==='NotAllowedError'?'Kameratilgang mangler. Tillat kamera eller skriv inn etikett-ID.':e.message;
  }finally{working=false;}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  run(async()=>{
    const action=b.dataset.action,value=b.dataset.value;
    if(action==='reset-filters'){Object.assign(activeFilter(),page==='jobs'?jobDefaults:defaults);render();return;}
    if(action==='view'){activeFilter().view=value;refreshResults();return;}
    if(action==='product'){
      if(page==='stock'||page==='pick'){source=page;window.history.replaceState({styling:true,page,jobId},'');window.history.pushState({styling:true,page:'product',productId:value,source,jobId},'');}
      productId=value;return go('product');
    }
    if(action==='camera'){if(!navigator.mediaDevices?.getUserMedia)throw Error('Bruk etikett-ID eller åpne siden med HTTPS for kamera.');return camera();}
    if(action==='print')return window.print();
    if(action==='item'){itemOrigin=page;return showItem(value);}
    if(action==='split'){
      const unit=data.items.find(i=>i.id===value);
      if(!confirm('Del grunnsofaen i to? Den eksisterende etiketten blir venstre endemodul. Høyre ende får en ny etikett.'))return;
      labels=(await api('split',{id:value,revision:unit.revision})).ids;await load();return go('labels');
    }
    if(action==='label'){labels=[value];return go('labels');}
    if(action==='job')jobId=value;
    if(['ready','hold','return'].includes(action)){await move(item(),action==='return'?'in':action,item().job);return showItem(itemId);}
    if(action==='disable'){if(!confirm('Deaktiver tilgangen for '+value+'?'))return;await api('disable',{email:value});await load();inviteUrl='';return go('staff');}
    if(action==='logout'){await api('logout',{});data=null;return go('jobs');}
    go(action);
  });
});
screen.onsubmit=e=>{
  e.preventDefault();const form=e.target,fields=Object.fromEntries(new FormData(form));
  run(async()=>{
    switch(form.dataset.form){
      case 'claim':await api('claim',{invitation,password:fields.password});invitation=null;window.history.replaceState(null,'',location.pathname+location.search);render();status.textContent='Kontoen er aktiv. Logg inn med e-post og passord.';break;
      case 'login':await api('login',fields);await load();if(itemId)await showItem(itemId);else go('jobs');break;
      case 'job':jobId=(await api('jobs',fields)).id;await load();go('job');break;
      case 'draft':selectedProduct=(await api('draft',fields)).id;await load();go('register');status.textContent='Produktutkastet er valgt. Angi antall eksemplarer.';break;
      case 'register':labels=(await api('items',{product:fields.product,count:Number(fields.count)})).ids;await load();go('labels');break;
      case 'scan':await scan(fields.id);form.reset();break;
      case 'checkout':await move(item(),'out',fields.job);await showItem(itemId);break;
      case 'invite':if(data.staff.some(s=>s.email===fields.email.trim().toLowerCase()&&s.active)&&!confirm('Erstatt eksisterende tilgang med en ny invitasjon?'))return;inviteUrl=(await api('invite',fields)).url;await load();go('staff');break;
    }
  });
};
window.addEventListener('popstate',e=>{
  if(!data||!e.state?.styling)return;
  jobId=e.state.jobId||jobId;productId=e.state.productId||productId;source=e.state.source||source;go(e.state.page);
});
if(invitation)render();else await run(async()=>{await load();if(itemId)await showItem(itemId);else render();});
