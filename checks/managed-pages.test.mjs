import test from 'node:test';import assert from 'node:assert/strict';
import {defaultSettings,validateSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=stockstrip20261107';
import {newContentPage,cardHref} from '../public/page-model.js?v=stockstrip20261107';
import {homeOccasionCards} from '../public/home-occasions.js?v=stockstrip20261107';
import {occasionLandingView} from '../public/occasion-landing-view.js?v=stockstrip20261107';
import {pageModel,renderSeo,sitemap} from '../server/seo.mjs';import {readHtmlTemplate} from '../server/html-templates.mjs';
const base=()=>validateSiteSettings(structuredClone(defaultSettings));
test('legacy content migrates once into a shared template and preserves edited fields',()=>{
 const s=base();assert.equal(s.contentPages.length,2);assert.equal(s.contentPages[0].gallery.length,4);assert.equal(s.contentPages[1].image,'/assets/foto-film-reklame-forside.jpg');
 s.contentPages[0].heading='Redigert messe';assert.deepEqual(validateSiteSettings(s),s);
 for(const id of ['messe','produksjon'])assert.match(occasionLandingView('/anledning.html?anledning='+id,s).html,/data-page-template="content"/);
});
test('new pages survive validation and render in initial HTML with correct canonical and sitemap',async()=>{
 const s=base(),p=newContentPage('ny-side','choice');p.heading='En ny valgside';p.area='fest';s.contentPages.push(p);
 const next=validateSiteSettings(s);assert.equal(next.contentPages[2].heading,p.heading);
 try{configureSiteSettings(next);const model=pageModel('/anledning.html',new URLSearchParams('anledning=ny-side'),[]);assert.equal(model.canonical,'/anledning.html?bruk=fest&anledning=ny-side');const html=renderSeo(await readHtmlTemplate('anledning.html'),model,[],true,next);assert.match(html,/En ny valgside/);assert.match(html,/data-page-template="choice"/);assert.match(html,/bruk=fest&kategori=Pakker/);assert.match(html,/data-custom-request/);assert.match(sitemap([],true),/anledning=ny-side/);}finally{configureSiteSettings();}
});
test('cards can grow, hide, reorder and target catalog categories or pages without duplicated stock',()=>{
 const s=base(),newCard={id:'nytt',title:'Nytt kort',image:'/assets/hero.jpg',productId:'',visible:true,destination:{type:'catalog',area:'fest',category:'Pakker',pageId:'alle'}};s.home.occasions.unshift(newCard);s.home.occasions[1].visible=false;
 const saved=validateSiteSettings(s),html=homeOccasionCards([],saved);assert.equal(saved.home.occasions.length,7);assert.doesNotMatch(html,/>Boligfoto og visning</);assert.match(html,/bruk=fest&amp;kategori=Pakker/);assert.ok(html.indexOf('Nytt kort')<html.indexOf('Messe, stand'));
 newCard.destination={type:'page',pageId:'messe',area:'alle',category:'Alle'};assert.equal(cardHref(newCard,s),'/anledning.html?bruk=messe&anledning=messe');
});
test('unsafe page values, duplicate IDs and broken card references are rejected',()=>{
 for(const change of [s=>s.contentPages[0].heading='<script>x</script>',s=>s.contentPages[0].image='javascript:x',s=>s.contentPages.push(s.contentPages[0]),s=>s.home.occasions[0].destination={type:'page',pageId:'missing',area:'alle',category:'Alle'},s=>s.contentPages[0].primaryCategory='" onclick="bad']){const s=base();change(s);assert.throws(()=>validateSiteSettings(s));}
});
