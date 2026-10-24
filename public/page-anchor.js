// Catalog returns restore saved pixels; content links follow their section.
export function pageAnchorTarget(document,hash){
 let id;try{id=decodeURIComponent(String(hash||'').replace(/^#/,''));}catch{return null;}
 return !id||id==='utvalg'?null:document.getElementById(id);
}

export function mountPageAnchor({document=globalThis.document,window=globalThis.window}={}){
 let ready=false,frame=0,timer=0,observer,activeHash='',interruptedHash;
 const hasTarget=()=>Boolean(pageAnchorTarget(document,window.location.hash));
 function cancel(){
  window.cancelAnimationFrame(frame);window.clearTimeout(timer);
  observer?.disconnect();observer=undefined;frame=timer=0;activeHash='';
 }
 function restore(){
  ready=true;cancel();
  const hash=window.location.hash,target=pageAnchorTarget(document,hash);
  if(!target)return false;
  // A slow catalog response must not undo a scroll the visitor already chose.
  // Still claim the anchor so reload/saved-position fallback cannot jump either.
  if(interruptedHash===hash)return true;
  activeHash=hash;
  const align=()=>{
   if(activeHash!==hash||window.location.hash!==hash)return;
   // scroll-padding on html provides the sticky header clearance.
   target.scrollIntoView({block:'start',behavior:'instant'});
  };
  const schedule=()=>{
   window.cancelAnimationFrame(frame);
   frame=window.requestAnimationFrame(()=>{frame=window.requestAnimationFrame(align);});
  };
  schedule();
  // Catch late image/layout changes for a short interval, never after user input.
  if(window.ResizeObserver){
   observer=new window.ResizeObserver(schedule);
   observer.observe(document.querySelector('main')||document.body);
  }
  timer=window.setTimeout(cancel,1500);
  return true;
 }
 const changed=()=>{interruptedHash=undefined;cancel();if(ready)restore();};
 const interrupted=()=>{interruptedHash=window.location.hash;cancel();};
 const inputs=['wheel','touchstart','pointerdown','keydown'];
 window.addEventListener('hashchange',changed);
 window.addEventListener('pagehide',cancel);
 for(const type of inputs)window.addEventListener(type,interrupted,{passive:true});
 return {hasTarget,restore,destroy(){cancel();window.removeEventListener('hashchange',changed);window.removeEventListener('pagehide',cancel);for(const type of inputs)window.removeEventListener(type,interrupted);}};
}
