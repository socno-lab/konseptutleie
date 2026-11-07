import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,validateSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=stockall20261107';
import {occasionLandingView} from '../public/occasion-landing-view.js?v=stockall20261107';
import {matchesPurpose} from '../public/rental-purpose-model.js?v=stockall20261107';
import {mediaUsage} from '../server/images.mjs';
import {pageModel} from '../server/seo.mjs';

test('legacy settings retain all landing defaults and collections',()=>{
 const legacy=structuredClone(defaultSettings);delete legacy.landingContent;delete legacy.collections;
 const next=validateSiteSettings(legacy);
 assert.deepEqual(next.landingContent,defaultSettings.landingContent);
 assert.deepEqual(next.collections,defaultSettings.collections);
});
test('all four configured landing headings render and messe preserves line breaks',()=>{
 const s=structuredClone(defaultSettings);
 for(const key of ['messe','bryllup','jul','produksjon']){
  s.landingContent[key].heading='Ny overskrift & innhold';s.landingContent[key].intro='Ny innledning fra admin';
  const view=occasionLandingView('/anledning.html?anledning='+key,s);
  assert.match(view.html,/Ny overskrift &amp; innhold/);assert.match(view.html,/Ny innledning fra admin/);
 }
 s.landingContent.messe.heading='Første linje\nAndre linje';
 assert.match(occasionLandingView('/anledning.html?anledning=messe',s).html,/Første linje<br>Andre linje/);
 try{configureSiteSettings(s);assert.equal(pageModel('/anledning.html',new URLSearchParams('anledning=messe'),[]).description,'Ny innledning fra admin');}finally{configureSiteSettings();}
});
test('invalid content and duplicate product assignments are rejected',()=>{
 for(const mutate of [s=>s.landingContent.messe.heading='<script>alert(1)</script>',s=>s.landingContent.messe.image='javascript:alert(1)',s=>s.collections.christmasProducts=[],s=>s.collections.productionProducts=['a','a']]){
  const s=structuredClone(defaultSettings);mutate(s);assert.throws(()=>validateSiteSettings(s));
 }
});
test('admin selections control exclusive christmas membership and manual production selection',()=>{
 const s=structuredClone(defaultSettings);s.collections.christmasProducts=['tree'];s.collections.productionMode='products';s.collections.productionProducts=['chair','tree'];
 try{
  configureSiteSettings(s);
  assert.equal(matchesPurpose({id:'tree',category:'Stoler'},'jul'),true);
  for(const purpose of ['messe','fest','produksjon'])assert.equal(matchesPurpose({id:'tree',category:'Stoler'},purpose),false);
  assert.equal(matchesPurpose({id:'chair',category:'Stoler'},'produksjon'),true);
  assert.equal(matchesPurpose({id:'other',category:'Stoler'},'produksjon'),false);
  assert.match(occasionLandingView('/anledning.html?anledning=jul',s).html,/produkt=tree/);
  s.collections.productionMode='categories';s.collections.productionCategories=['Bord'];configureSiteSettings(s);
  assert.equal(matchesPurpose({id:'table',category:'Bord'},'produksjon'),true);
  assert.equal(matchesPurpose({id:'chair',category:'Stoler'},'produksjon'),false);
  assert.equal(matchesPurpose({id:'package',category:'Bord',isPackage:true},'produksjon'),false);
 }finally{configureSiteSettings();}
});
test('all configured gallery images are protected by media usage',()=>{
 const s=structuredClone(defaultSettings);s.landingContent.messe.image4='/media/gallery';s.landingContent.produksjon.image='/media/production';
 assert.equal(mediaUsage({url:'/media/gallery'},[],s).length,1);
 assert.equal(mediaUsage({url:'/media/production'},[],s).length,1);
});
