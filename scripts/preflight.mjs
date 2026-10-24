// Read-only checks. No database connection, SMTP transport or application startup.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const result=(check,status,message)=>({check,status,message});
const present=value=>typeof value==='string'&&value.trim().length>0;
export function checkEnvironment(env){
 const checks=[];
 let originValid=false;try{const url=new URL(env.APP_ORIGIN);originValid=url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/'&&env.APP_ORIGIN===url.origin;}catch{}
 checks.push(result('origin',originValid?'pass':'fail',originValid?'Eksakt HTTPS-opprinnelse er konfigurert.':'APP_ORIGIN må være en eksakt HTTPS-opprinnelse uten sti, legitimasjon eller avsluttende skråstrek.'));
 const databaseReady=['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD'].every(key=>present(env[key]));
 checks.push(result('database',databaseReady?'pass':'fail',databaseReady?'Alle databasefelter er satt; tilkobling er ikke testet.':'Databasekonfigurasjonen er mangelfull; tilkobling er ikke testet.'));
 if(databaseReady&&!['localhost','127.0.0.1','::1'].includes(env.DB_HOST)&&env.DB_SSL!=='true')checks.push(result('database-tls','warn','Ekstern database uten eksplisitt TLS-validering; avklar transportbeskyttelsen med drift.'));
 const port=Number(env.SMTP_PORT||465),smtpReady=present(env.SMTP_PASS)&&(env.SMTP_USER||'post@konseptuell.no')==='post@konseptuell.no'&&[465,587].includes(port);
 checks.push(result('smtp',smtpReady?'pass':'fail',smtpReady?'SMTP-konfigurasjonen oppfyller lokale krav; ingen e-post er sendt.':'SMTP-passord, avsender eller port må kontrolleres. Ingen e-post er sendt.'));
 checks.push(result('setup-key',!present(env.ADMIN_SETUP_KEY)||env.ADMIN_SETUP_KEY.length>=24?'pass':'fail',present(env.ADMIN_SETUP_KEY)?'En satt oppsettnøkkel må ha minst 24 tegn.':'Oppsettnøkkel er ikke satt; dette er normalt etter at administrator er opprettet.'));
 checks.push(result('google',present(env.GOOGLE_MAPS_API_KEY)?'pass':'warn',present(env.GOOGLE_MAPS_API_KEY)?'Google-konfigurasjon finnes; API-restriksjoner og kvoter er ikke testet.':'Ingen Google-nøkkel konfigurert; frakt må avklares i tilbudet.'));
 return checks;
}
export function checkRuntime(version=process.versions.node){
 const [major,minor]=String(version).split('.').map(Number),valid=major>22||major===22&&minor>=13;
 return result('runtime',valid?'pass':'fail',valid?'Node oppfyller prosjektets minstekrav.':'Node 22.13.0 eller nyere kreves.');
}
export function publicOrigin(value){
 const url=new URL(value);
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Oppgi bare offentlig http/https-opprinnelse uten sti, legitimasjon eller parametre.');
 return url.origin;
}
export async function checkPublicHealth(value,{fetcher=fetch,timeout=5000,clock=Date.now}={}){
 const origin=publicOrigin(value),checks=[];
 for(const [check,route] of [['homepage','/'],['catalog','/api/catalog'],['submissions','/api/submissions'],['delivery','/api/delivery-estimate']]){
  const started=clock();let response;
  try{
   response=await fetcher(origin+route,{method:check==='homepage'?'HEAD':'GET',redirect:'error',headers:{Accept:check==='homepage'?'text/html':'application/json'},signal:AbortSignal.timeout(timeout)});
   let status=response.ok?'pass':'fail',message=response.ok?'Offentlig lesekall svarte.':'Offentlig lesekall feilet.';
   if(response.ok&&check!=='homepage'){
    const value=await response.json();
    if(check==='catalog'&&!Array.isArray(value?.products)){status='fail';message='Katalogsvaret har uventet format.';}
    if(['submissions','delivery'].includes(check)&&typeof value?.enabled!=='boolean'){status='fail';message='Statussvaret har uventet format.';}
    else if(['submissions','delivery'].includes(check)&&!value.enabled){status=check==='submissions'?'fail':'warn';message='Funksjonen er ikke aktivert.';}
   }
   checks.push({...result(check,status,message),http:response.status,durationMs:Math.max(0,clock()-started)});
   if(check==='homepage')checks.push(result('security-headers',response.headers.get('content-security-policy')&&response.headers.get('x-content-type-options')==='nosniff'?'pass':'warn','Kontroll av CSP og nosniff; TLS, DNS og leverandørlogger er ikke kontrollert.'));
  }catch{checks.push({...result(check,'fail','Offentlig lesekall fullførte ikke innen kontrollen.'),durationMs:Math.max(0,clock()-started)});}
  finally{try{await response?.body?.cancel();}catch{}}
 }
 return checks;
}
export async function main(args=process.argv.slice(2),{env=process.env,fetcher=fetch,write=console.log}={}){
 let inspectEnvironment=false,health='';
 for(let i=0;i<args.length;i++){if(args[i]==='--check-env')inspectEnvironment=true;else if(args[i]==='--public-health'&&args[i+1])health=args[++i];else{write('Ugyldige argumenter. Bruk --check-env og/eller --public-health https://offentlig-domene.');return 2;}}
 const checks=[checkRuntime(),...(inspectEnvironment?checkEnvironment(env):[])];
 if(health){try{checks.push(...await checkPublicHealth(health,{fetcher}));}catch{write('Ugyldig offentlig opprinnelse. Ingen nettverkskall utført.');return 2;}}
 write(JSON.stringify({mode:health?'public-read-only':'offline',checks},null,2));
 return checks.some(check=>check.status==='fail')?1:0;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main();
