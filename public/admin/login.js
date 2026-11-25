const returnParams=new URLSearchParams(location.search);
const stylingItem=returnParams.get('item');
const destination=returnParams.get('to')==='styling'?'/styling/index.html'+(/^K-[0-9A-F]{16}$/.test(stylingItem)?'?item='+stylingItem:''):'/admin';
const el=id=>document.getElementById(id);let setup=false;
const status=(message,error=false)=>{el('loginStatus').textContent=message;el('loginStatus').className=error?'error':'';};
function passwordStep(){el('codeForm').hidden=true;el('loginForm').hidden=false;el('loginCode').value='';el('loginPassword').value='';el('loginTitle').textContent=setup?'Opprett administrator':'Logg inn';el('loginIntro').textContent=setup?'Dette gjøres én gang. Produktkatalogen er allerede importert.':'Bruk administratorpassordet. Deretter bekrefter du innloggingen med en kode på e-post.';el('setupKeyLabel').hidden=!setup;el('setupKey').required=setup;el('setupHint').hidden=!setup;el('loginPassword').autocomplete=setup?'new-password':'current-password';el('loginSubmit').textContent=setup?'Opprett administrator':'Fortsett';}
async function post(path,body){const r=await fetch('/api/admin/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'Kunne ikke logge inn.');return data;}
try{const r=await fetch('/api/admin/status',{cache:'no-store'}),data=await r.json();if(!r.ok)throw Error(data.error||'Kunne ikke kontakte lagringen.');if(data.authenticated)location.replace(destination);else{setup=data.setupRequired;if(setup&&!data.setupAvailable)throw Error('Legg inn ADMIN_SETUP_KEY (minst 24 tegn) i Hostinger før første oppsett.');passwordStep();status('');}}catch(e){status(e.message,true);}
el('loginForm').addEventListener('submit',async e=>{e.preventDefault();el('loginSubmit').disabled=true;status('Kontrollerer og sender kode …');try{
 const data=await post(setup?'setup':'login',{email:el('loginEmail').value,password:el('loginPassword').value,...(setup?{key:el('setupKey').value}:{})});
 el('loginPassword').value='';el('setupKey').value='';
 if(data.loginRequired){setup=false;passwordStep();status('Administrator er opprettet. Logg inn med passord og e-postkode.');return;}
 if(!data.codeRequired)throw Error('Kunne ikke starte e-postbekreftelsen. Last inn siden på nytt.');
 el('loginForm').hidden=true;el('codeForm').hidden=false;el('loginTitle').textContent='Bekreft innlogging';el('loginIntro').textContent='Vi har sendt en kode til andreas@konseptboligstyling.no.';status('');el('loginCode').focus();
 }catch(e){status(e.message,true);}finally{el('loginSubmit').disabled=false;}});
el('codeForm').addEventListener('submit',async e=>{e.preventDefault();el('codeSubmit').disabled=true;status('Kontrollerer koden …');try{await post('login/verify',{code:el('loginCode').value.trim()});el('loginCode').value='';location.replace(destination);}catch(e){status(e.message,true);}finally{el('codeSubmit').disabled=false;}});
el('restartLogin').onclick=()=>{passwordStep();status('Oppgi passordet på nytt for å få en ny kode. Vent minst ett minutt mellom utsendingene.');el('loginPassword').focus();};
el('showLoginPassword').onchange=()=>{el('loginPassword').type=el('showLoginPassword').checked?'text':'password';};
