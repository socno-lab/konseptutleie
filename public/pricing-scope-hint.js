const key='konsept-pricing-explained-v1';let dismissed=false;
export function pricingHintDismissed(storage,session){try{if(storage?.getItem(key)==='understood')return true;}catch{}try{return session?.getItem(key)==='understood';}catch{return false;}}
export function rememberPricingHint(storage,session){for(const target of [storage,session])try{target?.setItem(key,'understood');}catch{}}
export function mountPricingScopeHint(catalog,{confirmed,label,enabled,control}){
 document.getElementById('pricingScopeHint')?.remove();
 let storage,session;try{storage=localStorage;}catch{}try{session=sessionStorage;}catch{}
 if(!enabled||!confirmed||dismissed||pricingHintDismissed(storage,session))return;
 const mobile=matchMedia('(max-width:640px)').matches;
 const anchor=control||(mobile?document.getElementById('mobileChangeUsage'):catalog?.querySelector('summary'));
 const host=control?catalog:mobile?anchor?.closest('.mobile-catalog-usage'):catalog;
 if(!host||!anchor)return;
 if(!document.getElementById('pricingScopeHintStyle')){const style=document.createElement('style');style.id='pricingScopeHintStyle';style.textContent=`
 .pricing-scope-hint{position:relative;max-width:520px;margin:16px 0 20px;padding:18px 20px;background:#fff;border:1px solid #414b38;box-shadow:0 4px 14px #2d332a12;color:#2d332a;font-size:13px;line-height:1.6;box-sizing:border-box}
 .pricing-scope-hint::before{content:'';position:absolute;top:-7px;left:var(--hint-arrow,24px);width:12px;height:12px;background:#fff;border-top:1px solid #414b38;border-left:1px solid #414b38;transform:rotate(45deg)}
 .pricing-scope-hint strong{display:block;font-size:14px;font-weight:600;margin-bottom:8px}
 .pricing-scope-hint p{margin:0 0 14px;font-size:13px;line-height:1.6}
 .pricing-scope-hint .button{min-height:44px;padding:10px 18px;font:inherit}
 @media(max-width:640px){.pricing-scope-hint{width:100%;max-width:none;margin:12px 0 18px;padding:16px}.pricing-scope-hint strong{font-size:14px}}
 `;document.head.append(style);}
 const box=document.createElement('aside');box.id='pricingScopeHint';box.className='pricing-scope-hint';box.setAttribute('aria-label','Om valgte leiepriser');
 const title=document.createElement('strong');title.textContent='Du ser leiepriser for '+label;
 const text=document.createElement('p');text.textContent='Bruksområdet du velger, avgjør hvilke leiepriser som vises. Skal møblene brukes til noe annet? Velg «Endre bruk».';
 if(mobile)text.textContent='Bruksområdet du velger, avgjør hvilke leiepriser som vises. Skal møblene brukes til noe annet? Trykk «Endre» ovenfor.';
 if(control)text.textContent='Bruksområdet du velger, avgjør hvilke leiepriser som vises. Skal møblene brukes til noe annet? Trykk på feltet med valgt bruksområde ovenfor.';
 const button=document.createElement('button');button.type='button';button.className='button dark';button.textContent='Forstått';button.onclick=()=>{dismissed=true;rememberPricingHint(storage,session);box.remove();};
 box.append(title,text,button);host.after(box);
 const position=()=>{if(!box.isConnected)return;const range=document.createRange();range.selectNodeContents(anchor);const a=mobile?anchor.getBoundingClientRect():range.getBoundingClientRect(),b=box.getBoundingClientRect();box.style.setProperty('--hint-arrow',Math.min(b.width-24,Math.max(18,a.left+a.width/2-b.left-6))+'px');};
 requestAnimationFrame(()=>{const notice=document.querySelector('.cookie-info');if(notice){box.hidden=true;notice.querySelector('button')?.addEventListener('click',()=>{box.hidden=false;requestAnimationFrame(position);},{once:true});}else position();});
}
