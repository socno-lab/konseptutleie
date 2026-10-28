const key='konsept-pricing-explained-v1';let dismissed=false,unmount=null;
export function pricingHintDismissed(storage,session){try{if(storage?.getItem(key)==='understood')return true;}catch{}try{return session?.getItem(key)==='understood';}catch{return false;}}
export function rememberPricingHint(storage,session){for(const target of [storage,session])try{target?.setItem(key,'understood');}catch{}}

export function pricingHintPlacement({host,anchor,width,height,left=0,top=0,viewportWidth,viewportHeight,headerBottom=top}){
 const minX=left+12,maxX=left+viewportWidth-12,minY=Math.max(top,headerBottom)+12,maxY=top+viewportHeight-12;
 const x=Math.max(minX,Math.min(host.left,maxX-width)),below=host.bottom+12,above=host.top-height-12;
 const y=below+height<=maxY?below:above>=minY?above:Math.max(minY,maxY-height);
 const side=y>=anchor.bottom?'below':y+height<=anchor.top?'above':'overlap';
 return {left:x,top:y,side,arrow:Math.max(18,Math.min(width-24,anchor.left+anchor.width/2-x-6))};
}

export function mountPricingScopeHint(catalog,{confirmed,label,enabled,control}){
 unmount?.();document.getElementById('pricingScopeHint')?.remove();
 let storage,session;try{storage=localStorage;}catch{}try{session=sessionStorage;}catch{}
 if(!enabled||!confirmed||dismissed||pricingHintDismissed(storage,session))return;
 const activeAnchor=()=>control||(matchMedia('(max-width:640px)').matches?document.getElementById('mobileChangeUsage'):catalog?.querySelector('summary'));
 if(!catalog||!activeAnchor())return;
 if(!document.getElementById('pricingScopeHintStyle')){
  const style=document.createElement('style');style.id='pricingScopeHintStyle';style.textContent=`
  .pricing-scope-hint{position:fixed;z-index:60;display:flex;flex-direction:column;width:520px;max-width:calc(100vw - 24px);margin:0;padding:18px 20px;background:#fff;border:1px solid #414b38;box-shadow:0 4px 14px #2d332a12;color:#2d332a;font-size:13px;line-height:1.6;box-sizing:border-box}
  .pricing-scope-hint[hidden]{display:none}
  .pricing-scope-hint::before{content:'';position:absolute;top:-7px;left:var(--hint-arrow,24px);width:12px;height:12px;background:#fff;border-top:1px solid #414b38;border-left:1px solid #414b38;transform:rotate(45deg)}
  .pricing-scope-hint[data-side=above]::before{top:auto;bottom:-7px;transform:rotate(225deg)}
  .pricing-scope-hint[data-side=overlap]::before{display:none}
  .pricing-scope-hint-heading{display:flex;align-items:flex-start;gap:12px;flex-shrink:0;margin-bottom:8px}
  .pricing-scope-hint strong{display:block;flex:1;font-size:14px;font-weight:600;padding-top:10px}
  .pricing-scope-hint-close{display:flex;align-items:center;justify-content:center;flex:0 0 44px;width:44px;height:44px;padding:0;border:1px solid #d9dbcf;background:#fff;color:#2d332a;font:inherit;font-size:20px;line-height:1;cursor:pointer}
  .pricing-scope-hint p{min-height:0;overflow:auto;margin:0 0 14px;font-size:13px;line-height:1.6}
  .pricing-scope-hint-actions{flex-shrink:0}
  .pricing-scope-hint .button{min-height:44px;padding:10px 18px;font:inherit;justify-content:center;text-align:center}
  @media(max-width:640px){.pricing-scope-hint{padding:16px}.pricing-scope-hint strong{font-size:14px}}
  `;document.head.append(style);
 }
 const box=document.createElement('aside');box.id='pricingScopeHint';box.className='pricing-scope-hint';box.setAttribute('aria-label','Om valgte leiepriser');box.style.visibility='hidden';
 const heading=document.createElement('div');heading.className='pricing-scope-hint-heading';
 const title=document.createElement('strong');title.textContent='Du ser leiepriser for '+label;
 const close=document.createElement('button');close.type='button';close.className='pricing-scope-hint-close';close.textContent='×';close.setAttribute('aria-label','Lukk prisforklaringen midlertidig');
 const text=document.createElement('p'),actions=document.createElement('div');actions.className='pricing-scope-hint-actions';
 const button=document.createElement('button');button.type='button';button.className='button dark';button.textContent='Forstått';
 heading.append(title,close);actions.append(button);box.append(heading,text,actions);document.body.append(box);
 const events=new AbortController();let frame=0;
 function dismiss(remember=false){const returnFocus=box.contains(document.activeElement),anchor=activeAnchor();dismissed=true;if(remember)rememberPricingHint(storage,session);cleanup();if(returnFocus)anchor?.focus({preventScroll:true});}
 function position(){
  frame=0;if(!box.isConnected)return;
  const anchor=activeAnchor(),mobile=matchMedia('(max-width:640px)').matches,host=control?catalog:mobile?anchor?.closest('.mobile-catalog-usage'):catalog;
  const viewport=window.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,viewportWidth=viewport?.width||innerWidth,viewportHeight=viewport?.height||innerHeight;
  const a=anchor?.getBoundingClientRect(),h=host?.getBoundingClientRect(),header=document.querySelector('body>header')?.getBoundingClientRect(),headerBottom=header&&header.bottom>top&&header.top<top+viewportHeight?header.bottom:top;
  const availableHeight=top+viewportHeight-Math.max(top,headerBottom)-24;
  if(availableHeight<180||!a||!h||!a.width||!a.height||a.bottom<=Math.max(top,headerBottom)||a.top>=top+viewportHeight||a.right<=left||a.left>=left+viewportWidth||document.querySelector('.cookie-info,dialog[open]')||pricingHintDismissed(storage,session)){box.hidden=true;return;}
  box.hidden=false;box.style.visibility='hidden';
  const explanation='Bruksområdet du velger, avgjør hvilke leiepriser som vises. Skal møblene brukes til noe annet? '+(control?'Trykk på feltet med valgt bruksområde.':mobile?'Trykk «Endre».':'Velg «Endre bruk».');
  if(text.textContent!==explanation)text.textContent=explanation;
  box.style.width=Math.min(520,h.width,viewportWidth-24)+'px';box.style.maxHeight=availableHeight+'px';
  const b=box.getBoundingClientRect(),placement=pricingHintPlacement({host:h,anchor:a,width:b.width,height:b.height,left,top,viewportWidth,viewportHeight,headerBottom});
  box.style.left=placement.left+'px';box.style.top=placement.top+'px';box.dataset.side=placement.side;box.style.setProperty('--hint-arrow',placement.arrow+'px');box.style.visibility='visible';
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(position);}
 const observer=new MutationObserver(records=>{if(records.some(record=>!box.contains(record.target)))schedule();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 const resize=new ResizeObserver(schedule);resize.observe(catalog);resize.observe(box);
 function cleanup(){events.abort();observer.disconnect();resize.disconnect();cancelAnimationFrame(frame);box.remove();if(unmount===cleanup)unmount=null;}
 unmount=cleanup;close.onclick=()=>dismiss();button.onclick=()=>dismiss(true);
 window.addEventListener('resize',schedule,{signal:events.signal});window.addEventListener('scroll',schedule,{capture:true,passive:true,signal:events.signal});window.addEventListener('storage',schedule,{signal:events.signal});
 window.visualViewport?.addEventListener('resize',schedule,{signal:events.signal});window.visualViewport?.addEventListener('scroll',schedule,{signal:events.signal});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!box.hidden&&!document.querySelector('dialog[open]')){event.preventDefault();dismiss();}},{signal:events.signal});
 schedule();
}
