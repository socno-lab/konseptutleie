import {isKiPhoto,kiDisclosure} from './image-provenance.js?v=launch20261024';
import {responsiveImageAttributes} from './media-image.js?v=launch20261024';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const areas={boligfoto:'boligsalg',messe:'messe',bryllup:'fest',jul:'jul',bedrift:'bedrift',alle:'alle'};
// The server and client render the same admin-controlled cards, before the first paint.
export function homeOccasionCards(products,settings){
 return settings.home.occasions.map(c=>{
  const p=products.find(p=>p.id===c.productId&&p.active&&p.rentalEnabled!==false&&!p.deletedAt),src=c.image||p?.image||'/assets/hero.jpg';
  const href=c.id==='boligfoto'?'/utvalg.html?bruk=boligsalg&kategori=Enkeltprodukter#utvalg':c.id==='alle'?'/utvalg.html?bruk=alle#utvalg':'/anledning.html?bruk='+areas[c.id]+'&anledning='+c.id;
  return `<a href="${escape(href)}"><figure><img src="${escape(src)}" ${responsiveImageAttributes(src,'(max-width:640px) 50vw, 33vw')} alt="" loading="lazy" decoding="async"><span>${isKiPhoto(src,settings)?kiDisclosure:'Illustrasjonsbilde'}</span></figure><div><h3>${escape(c.title)}</h3><span aria-hidden="true">↗</span></div></a>`;
 }).join('');
}
