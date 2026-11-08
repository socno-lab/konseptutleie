import test from 'node:test';import assert from 'node:assert/strict';
import {defaultSettings,validateSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=fest20261108b';
import {newContentPage,cardHref} from '../public/page-model.js?v=stockmobile20261107';
import {homeOccasionCards} from '../public/home-occasions.js?v=stockmobile20261107';
import {occasionLandingView} from '../public/occasion-landing-view.js?v=stockmobile20261107';
import {pageModel,renderSeo,sitemap} from '../server/seo.mjs';import {readHtmlTemplate} from '../server/html-templates.mjs';
const base=()=>validateSiteSettings(structuredClone(defaultSettings));
test('legacy content migrates once into a shared template and preserves edited fields',()=>{
 const s=base();assert.equal(s.contentPages.length,3);assert.equal(s.contentPages[0].gallery.length,4);assert.equal(s.contentPages[1].image,'/assets/foto-film-reklame-forside.jpg');
 s.contentPages[0].heading='Redigert messe';assert.deepEqual(validateSiteSettings(s),s);
 for(const id of ['messe','produksjon'])assert.match(occasionLandingView('/anledning.html?anledning='+id,s).html,/data-page-template="content"/);
});
test('new pages survive validation and render in initial HTML with correct canonical and sitemap',async()=>{
 const s=base(),p=newContentPage('ny-side','choice');p.heading='En ny valgside';p.area='fest';s.contentPages.push(p);
 const next=validateSiteSettings(s);assert.equal(next.contentPages.find(x=>x.id==='ny-side').heading,p.heading);
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

test('season page preserves edits and routes each choice independently',()=>{
 const s=base(),p=s.contentPages.find(p=>p.id==='bryllup');assert.equal(p.kind,'content');assert.equal(p.sections.length,4);
 const html=occasionLandingView('/anledning.html?anledning=bryllup',s).html;
 for(const target of ['obj_b3af6675a38744e0bc567acc3c547849','obj_82cd3d7f152a41c3b6d6b5f04a4352f7','bruk=jul&amp;anledning=jul','bruk=fest&kategori=Enkeltprodukter'])assert.ok(html.includes(target));
 p.heading='Vår festside';assert.equal(validateSiteSettings(s).contentPages.find(p=>p.id==='bryllup').heading,'Vår festside');
 for(const href of ['https://evil.example','//evil.example','/anledning.html?x=\\evil','javascript:alert(1)']){p.sections[0].href=href;assert.throws(()=>validateSiteSettings(s));}
});
