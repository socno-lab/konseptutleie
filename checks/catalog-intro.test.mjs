import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalogIntroHtml} from '../public/catalog-intro.js';
import {pageModel,renderSeo} from '../server/seo.mjs';

const source=readFileSync(new URL('../public/utvalg.html',import.meta.url),'utf8');
const products=[{id:'synthetic-chair',name:'TEST stol',category:'Stoler',active:true,rentalEnabled:true,purposes:['boligsalg','messe'],saleEnabled:true,salePrice:1200}];
const intro=html=>html.match(/<p id="catalogIntro">([\s\S]*?)<\/p>/)?.[1];

test('housing introduction is correct before JavaScript, including category-filtered housing pages',()=>{
 for(const query of ['bruk=boligsalg','bruk=boligsalg&kategori=Stoler']){
  const model=pageModel('/utvalg.html',new URLSearchParams(query),products);
  assert.equal(intro(renderSeo(source,model,products,false)),catalogIntroHtml('boligsalg'));
  assert.match(model.catalogIntro,/Finn det du mangler til boligfoto og visning\./);
  assert.doesNotMatch(model.catalogIntro,/barbord|lounge/);
 }
});

test('returning from housing to other purposes restores the existing event introduction',()=>{
 const eventIntro='Fra ett barbord til en hel lounge.<br>Velg møblene, så tar vi detaljene sammen.';
 for(const purpose of ['boligsalg','messe','bedrift','fest','jul','alle','event']){
  const model=pageModel('/utvalg.html',new URLSearchParams({bruk:purpose}),products);
  assert.equal(intro(renderSeo(source,model,products,false)),catalogIntroHtml(purpose));
  if(purpose!=='boligsalg')assert.equal(catalogIntroHtml(purpose),eventIntro);
 }
});

test('purchase and occasion pages do not adopt the rental housing introduction',()=>{
 const buy=pageModel('/kjop.html',new URLSearchParams('bruk=boligsalg'),products);
 assert.equal(buy.catalogIntro,undefined);
 const occasion=pageModel('/anledning.html',new URLSearchParams('anledning=messe'),products);
 assert.equal(occasion.catalogIntro,undefined);
 assert.match(occasion.description,/messestand, event og loungeområder/);
});
