import {getSiteSettings} from './site-settings.js?v=pages20261107';
import {defaultLandingContent} from './landing-content.js?v=content20261107';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Shared server/client landing content. No pricing, catalogue or basket mutations.
export function renderMesseLanding(settings=getSiteSettings()){const c=settings.landingContent?.messe||defaultLandingContent.messe;return `<div id="konsept-messe-preview" class="messe-landing"><div class="km-wrap">
<a class="km-back" href="/">← Til forsiden</a>
<section class="km-hero">
<div><p class="km-eyebrow">${e(c.text7)}</p><h1>${c.heading.split('\n').map(e).join('<br>')}</h1><p class="km-intro">${e(c.intro)}</p>
<div class="km-actions"><a class="km-main" href="#km-oppsett">${e(c.text9)}<span aria-hidden="true">↗</span></a><button type="button" class="km-link" data-custom-request>${e(c.text10)}<span aria-hidden="true">↗</span></button></div><p class="km-note">${e(c.text11)}</p></div>
<div class="km-hero-photo"><img class="km-image" src="${e(c.image)}" alt="${e(c.imageAlt)}"></div>
</section>
<div class="km-strip"><span>${e(c.text12)}</span><span>${e(c.text13)}</span><span>${e(c.text14)}</span></div>
<section class="km-section"><div class="km-section-title"><h2>${e(c.text15)}</h2><p>${e(c.text16)}</p></div>
<div class="km-case"><img id="km-selected-photo" class="km-case-photo" src="${e(c.image)}" alt="${e(c.imageAlt2)}"><div class="km-case-copy"><p class="km-eyebrow">${e(c.text17)}</p><h3 id="km-caption">${e(c.text)}</h3><p id="km-description">${e(c.text2)}</p></div></div>
<div class="km-gallery" aria-label="Bilder fra leveransen"><button type="button" aria-pressed="true" data-image="${e(c.image)}" data-caption="${e(c.text)}" data-description="${e(c.text2)}"><img src="${e(c.image)}" alt="${e(c.imageAlt3)}"><span>${e(c.text18)}<small>${e(c.text19)}</small></span></button>
<button  type="button" aria-pressed="false" data-image="${e(c.image2)}" data-caption="${e(c.text)}" data-description="${e(c.text2)}"><img src="${e(c.image2)}" alt="${e(c.imageAlt4)}"><span>${e(c.text20)}<small>${e(c.text21)}</small></span></button>
<button  type="button" aria-pressed="false" data-image="${e(c.image3)}" data-caption="${e(c.text3)}" data-description="${e(c.text4)}"><img src="${e(c.image3)}" alt="${e(c.imageAlt5)}"><span>${e(c.text22)}<small>${e(c.text23)}</small></span></button>
<button  type="button" aria-pressed="false" data-image="${e(c.image4)}" data-caption="${e(c.text5)}" data-description="${e(c.text6)}"><img src="${e(c.image4)}" alt="${e(c.imageAlt6)}"><span>${e(c.text24)}<small>${e(c.text25)}</small></span></button>
</div></section>
<section id="km-oppsett" class="km-section"><h2>${e(c.text26)}</h2><div class="km-choices">
<article class="km-choice"><h3>${e(c.text27)}</h3><p>${e(c.text28)}</p><a class="km-link" href="/utvalg.html?bruk=messe&kategori=Pakker&prisbruk=messe">${e(c.text29)}<span aria-hidden="true">↗</span></a></article>
<article class="km-choice"><h3>${e(c.text30)}</h3><p>${e(c.text31)}</p><a class="km-link" href="/utvalg.html?bruk=messe&kategori=Enkeltprodukter&prisbruk=messe">${e(c.text32)}<span aria-hidden="true">↗</span></a></article>
<article class="km-choice"><h3>${e(c.text33)}</h3><p>${e(c.text34)}</p><button type="button" class="km-link" data-custom-request>${e(c.text35)}<span aria-hidden="true">↗</span></button></article>
</div></section>
<section id="km-kontakt" class="km-cta"><div><h2>${e(c.text36)}</h2><p>${e(c.text37)}</p></div><button type="button" class="km-link" data-custom-request>${e(c.text38)}<span aria-hidden="true">↗</span></button></section>
<section class="km-faq"><h2>${e(c.text39)}</h2><details><summary>${e(c.text40)}</summary><p>${e(c.text41)}</p></details><details><summary>${e(c.text42)}</summary><p>${e(c.text43)}</p></details><details><summary>${e(c.text44)}</summary><p>${e(c.text45)}</p></details></section>

</div></div>`;}

if(typeof document!=='undefined')document.addEventListener('click',event=>{const button=event.target.closest('.km-gallery button');if(!button)return;const root=button.closest('.messe-landing');if(!root)return;const photo=root.querySelector('#km-selected-photo');photo.removeAttribute('srcset');photo.removeAttribute('sizes');photo.src=button.dataset.image;photo.alt=button.querySelector('img').alt;root.querySelector('#km-caption').textContent=button.dataset.caption;root.querySelector('#km-description').textContent=button.dataset.description;root.querySelectorAll('.km-gallery button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));});
