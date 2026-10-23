import './customer-info.js?v=services20261023';
import './dialog-scroll-lock.js?v=dialoglock1';
export function mountStorefrontFeedback(openCart){
 const header=document.querySelector('body>header');
 const buying=document.body.classList.contains('buy-page'),addedLabel=buying?'Lagt i handlekurven':'Lagt til i forespørselen';
 const notice=document.createElement('aside');notice.className='added-notice';notice.hidden=true;notice.setAttribute('aria-label',addedLabel);
 notice.innerHTML=`<div><strong>${addedLabel}</strong><p role="status" aria-live="polite" aria-atomic="true"></p><button type="button" class="added-notice-view">${buying?'Se handlekurven':'Se forespørselen'}</button></div><button type="button" class="added-notice-close" aria-label="Lukk bekreftelse">×</button>`;
 document.body.append(notice);let timer;
 const position=()=>{if(header){document.documentElement.style.setProperty('--storefront-header-height',header.offsetHeight+'px');notice.style.top=Math.max(12,header.getBoundingClientRect().bottom+12)+'px';}};
 if(header)new ResizeObserver(position).observe(header);window.addEventListener('scroll',position,{passive:true});window.addEventListener('resize',position);position();
 const hide=()=>{clearTimeout(timer);notice.hidden=true;};
 const later=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(notice.contains(document.activeElement))later();else hide();},4000);};
 notice.querySelector('.added-notice-close').onclick=hide;
 notice.querySelector('.added-notice-view').onclick=()=>{hide();openCart();};
 return text=>{notice.querySelector('[role="status"]').textContent=text;notice.hidden=false;position();later();};
}
