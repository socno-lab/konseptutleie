// Installed before the deferred cart module, so even a failed module download can recover.
(()=>{
 if(location.pathname!=='/foresporsel.html')return;
 const url=new URL(location.href);
 let timer;
 function recover(){
  const loading=document.getElementById('enquiryLoading');
  if(!loading||document.hidden||!loading.querySelector('[role="status"]'))return;
  if(!url.searchParams.has('kurvforsok')){
   url.searchParams.set('kurvforsok','1');
   location.replace(url.href);
   return;
  }
  loading.querySelector('[role="status"]').textContent='Handlekurven kunne ikke åpnes.';
  const retry=loading.querySelector('[data-retry-cart]');
  if(retry)retry.hidden=false;
 }
 function arm(){
  clearTimeout(timer);
  if(!document.hidden)timer=setTimeout(recover,15000);
 }
 window.addEventListener('error',event=>{
  if(event.target?.tagName==='SCRIPT'&&event.target.src.includes('/rental-enquiry.bundle.js'))recover();
 },true);
 document.addEventListener('readystatechange',()=>{if(document.readyState==='interactive')arm();});
 document.addEventListener('visibilitychange',arm);
 window.addEventListener('pageshow',arm);
 window.addEventListener('pagehide',()=>clearTimeout(timer));
})();
