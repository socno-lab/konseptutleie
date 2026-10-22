const key='konsept-cookie-info-v1',version=1,lifetime=180*86400000;
// This acknowledges information about essential storage; it grants no tracking consent.
export function storageNoticeDismissed(storage,legacy,now=Date.now()){
 try{const saved=JSON.parse(storage.getItem(key)||'null');if(saved?.version===version&&Number.isFinite(saved.until)&&saved.until>now&&saved.until<=now+lifetime)return true;}catch{}
 try{if(legacy?.getItem(key)==='closed'){rememberStorageNotice(storage,legacy,now);return true;}}catch{}
 return false;
}
export function rememberStorageNotice(storage,legacy,now=Date.now()){
 try{storage.setItem(key,JSON.stringify({version,until:now+lifetime}));legacy?.removeItem(key);return true;}catch{}
 try{legacy?.setItem(key,'closed');}catch{}return false;
}
export function mountStorageNotice(){
 let storage,legacy;try{storage=window.localStorage;}catch{}try{legacy=window.sessionStorage;}catch{}
 if(storageNoticeDismissed(storage,legacy))return;
 const banner=document.createElement('aside');banner.className='cookie-info';banner.setAttribute('aria-label','Informasjon om lagring og personvern');
 banner.innerHTML='<div><strong>Handlekurv og personvern</strong><p>Vi bruker funksjonell lagring for handlekurven og valgene dine. Butikken har ingen statistikk- eller markedsføringssporing.</p></div><a href="/kundeinfo.html#informasjonskapsler">Les mer</a><button type="button" class="button dark">Forstått</button>';
 banner.querySelector('button').onclick=()=>{rememberStorageNotice(storage,legacy);banner.remove();};document.body.append(banner);
 addEventListener('storage',event=>{if(event.key===key&&storageNoticeDismissed(storage,legacy))banner.remove();});
}
