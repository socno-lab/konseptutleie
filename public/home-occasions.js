import {isKiPhoto,kiDisclosure} from './image-provenance.js?v=content20261107';
import {responsiveImageAttributes} from './media-image.js?v=launch20261024';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Render the final icon on both server and client so icons.js cannot invalidate
// the hydration comparison and replace already decoded images.
const arrowUpRightIcon='<svg class="icon-arrow-up-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const areas={boligfoto:'boligsalg',messe:'messe',bryllup:'fest',jul:'jul',produksjon:'produksjon',bedrift:'bedrift',alle:'alle'};
// The server and client render the same admin-controlled cards, before the first paint.
export function homeOccasionCards(products,settings){
 return settings.home.occasions.map((c,index)=>{
  const p=products.find(p=>p.id===c.productId&&p.active&&p.rentalEnabled!==false&&!p.deletedAt),src=c.image||p?.image||'/assets/hero.jpg';
  const href=c.id==='boligfoto'?'/utvalg.html?bruk=boligsalg&kategori=Enkeltprodukter#utvalg':c.id==='alle'?'/utvalg.html?bruk=alle#utvalg':'/anledning.html?bruk='+areas[c.id]+'&anledning='+c.id;
  return `<a href="${escape(href)}"><figure><img src="${escape(src)}" ${responsiveImageAttributes(src,'(max-width:640px) 50vw, 33vw')} alt="" loading="${index<3?'eager':'lazy'}"${index===0?' fetchpriority="high"':''} decoding="async"><span>${isKiPhoto(src,settings)?kiDisclosure:'Illustrasjonsbilde'}</span></figure><div><h3>${escape(c.title)}</h3><span aria-hidden="true">${arrowUpRightIcon}</span></div></a>`;
 }).join('');
}
