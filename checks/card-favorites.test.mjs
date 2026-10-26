import test from 'node:test';
import assert from 'node:assert/strict';
import {favoriteCardEntry} from '../public/card-favorites.js';
import {buildHeaderCatalog,cleanFavoriteIds} from '../public/header-catalog-model.js';
const item=(id,extra={})=>({id,name:id,category:'Stoler',active:true,rentalEnabled:true,saleEnabled:true,...extra});
test('catalogue card and linked recommendations save the same favorite across rental and purchase',()=>{
 const entries=buildHeaderCatalog([item('chair'),item('package',{isPackage:true})]);
 for(const productId of ['chair','package']){
  const entry=favoriteCardEntry(entries,{productId});
  assert.equal(entry.id,'product:'+productId);
  assert.deepEqual(cleanFavoriteIds([entry.id,entry.id]),[entry.id]);
 }
 assert.equal(favoriteCardEntry(entries,{productId:'missing'}),undefined);
 assert.equal(favoriteCardEntry(entries,{}),undefined);
});
test('any sofa module and the pictured family card resolve to one whole sofa favorite',()=>{
 const series='Modulsofa, lys beige',entries=buildHeaderCatalog([item('left',{category:'Sofaer',moduleSeries:series}),item('middle',{category:'Sofaer',moduleSeries:series})]);
 const entry=favoriteCardEntry(entries,{series});
 assert.equal(entry.kind,'module');
 for(const productId of ['left','middle'])assert.equal(favoriteCardEntry(entries,{productId}),entry);
});
test('wall, grouped colour and service variants use canonical favorites instead of duplicates',()=>{
 const products=[item('w1',{isService:true,wallGroup:'Bildevegg',category:'Bilder'}),item('w2',{isService:true,wallGroup:'Bildevegg',category:'Bilder'}),item('red',{category:'Belysning',variantGroup:'Mush',variantLabel:'Rød'}),item('green',{category:'Belysning',variantGroup:'Mush',variantLabel:'Grønn'}),item('tree180',{offeringType:'service',serviceGroup:'Klart til jul'}),item('tree210',{offeringType:'service',serviceGroup:'Klart til jul'})];
 const entries=buildHeaderCatalog(products);
 assert.equal(favoriteCardEntry(entries,{wall:'Bildevegg'}),favoriteCardEntry(entries,{productId:'w2'}));
 assert.equal(favoriteCardEntry(entries,{productId:'red'}),favoriteCardEntry(entries,{productId:'green'}));
 assert.equal(favoriteCardEntry(entries,{productId:'tree180'}),favoriteCardEntry(entries,{productId:'tree210'}));
});
