import test from 'node:test';
import assert from 'node:assert/strict';
import {sofaCardConfiguration} from '../public/sofa-card-model.js';
import {moduleCardImage} from '../public/module-card-image.js';
import {ratePlan} from '../public/catalog-model.js';
import {applyRentalScope} from '../public/rental-pricing-model.js';

const cover='/media/9ed8bbde97fa7549978a7df6bdbbae45';
const base={id:'obj_jysk_skibby_base_sand',name:'Begge ender',moduleSeries:'JYSK SKIBBY, sand',moduleRole:'base',moduleWidth:186,category:'Sofaer',active:true,rentalEnabled:true,stock:1,unavailable:0,image:'/base.webp',gallery:[cover],price:100,weekPrice:100,monthPrice:1000};
const middle={...base,id:'obj_jysk_skibby_midt_sand',name:'Midtmodul',moduleRole:'middle',moduleWidth:72,image:'/middle.webp',gallery:[],price:1,weekPrice:100,monthPrice:1000};
const products=()=>[{...base,gallery:[cover]},{...middle}];

test('pictured Skibby has two ends plus one middle, independently of cart stock',()=>{
 const modules=products(),quote=sofaCardConfiguration(modules);
 assert.deepEqual(quote.selection,{[base.id]:1,[middle.id]:1});
 assert.equal(quote.count,3);assert.equal(quote.width,258);assert.equal(quote.widthKnown,true);
 assert.equal(quote.selectedTotal,null);assert.equal(quote.isPackage,true);assert.equal(quote.rentalPricingMode,'components');
 modules.forEach(p=>{p.stock=0;p.unavailable=1;});
 assert.deepEqual(sofaCardConfiguration(modules),quote);
 modules[1].moduleWidth=0;
 assert.equal(sofaCardConfiguration(modules).widthKnown,false);
 assert.equal(sofaCardConfiguration(modules).price,quote.price);
});

test('every existing whole-sofa cover prices its exact pictured module count',()=>{
 const profiles=[
  ['/assets/beige-sofa-tre-moduler.webp',[['obj_371e3a52807c452ea1280dafd434b7e4','end',2],['obj_d9314111959a42bf8b7ca3015af09003','middle',1]],3],
  ['/media/73c49cd2b92a987fb22ae340307580c7',[['obj_4e31c6c5bcca4f91abad27609806ac0f','base',1]],2],
  ['/media/3993f06aed296378b567af4be29bbba1',[['obj_7cd158cfb2cf4e51b9f6644ba0544082','left',1],['obj_834d73bb940f495b81853eaf5f7f5a39','right',1]],2],
  ['/media/544e49c37f1d4bb8c9db5363ad67cb90',[['obj_dbf1ef0037c54e0caa4962d4e20a99da','left',1],['obj_053c65ceffb2449ebfd703abe8536a3c','right',1]],2],
  ['/assets/lagoon-connected-v1.webp',[['obj_broste_lagoon_31000586','left',1],['obj_broste_lagoon_31000583','middle',1],['obj_broste_lagoon_31000585','right',1]],3],
  ['/media/09e34b3bdfc2dd14a2fd1f0915d4bc2c',[['obj_ikea_stockholm2025_base_brun','base',1],['obj_ikea_stockholm2025_midt_brun','middle',1]],3],
  [cover,[[base.id,'base',1],[middle.id,'middle',1]],3]
 ];
 for(const [image,parts,count] of profiles){
  const modules=parts.map(([id,moduleRole],i)=>({...base,id,moduleRole,image:'/module-'+i+'.webp',gallery:i?[]:[image],price:10,weekPrice:50,monthPrice:150}));
  const quote=sofaCardConfiguration(modules),units=parts.reduce((sum,[,,quantity])=>sum+quantity,0);
  assert.equal(moduleCardImage(modules),image);assert.equal(quote.count,count,image);assert.equal(quote.price,units*10,image);
  assert.deepEqual(quote.selection,Object.fromEntries(parts.map(([id,,quantity])=>[id,quantity])));
 }
});

test('each duration optimizes actual lines before summing, including selected-period rateGrid use',()=>{
 for(const days of [1,2,7,30,31,60,61]){
  const modules=products(),quote=sofaCardConfiguration(modules,days),expected=100*Math.ceil(days/7)+days;
  assert.equal(quote.selectedTotal,expected,`${days} days`);
  assert.equal(ratePlan(quote,days,modules).total,expected,`rateGrid components ${days} days`);
  assert.deepEqual([quote.price,quote.weekPrice,quote.monthPrice],[101,107,530]);
 }
});

test('priced card follows both current pricing scopes and does not apply scope twice',()=>{
 const modules=products().map(p=>({...p,rentalRates:{standard:{price:10,weekPrice:50,monthPrice:150},messe:{price:20,weekPrice:90,monthPrice:250}}}));
 for(const [scope,expected] of [['standard',[20,100,300]],['messe',[40,180,500]]]){
  const quote=sofaCardConfiguration(applyRentalScope(modules,scope),7);
  assert.deepEqual([quote.price,quote.weekPrice,quote.monthPrice],expected);assert.equal(quote.selectedTotal,expected[1]);
 }
});

test('module cents are rounded per actual rental line before multiplying its quantity',()=>{
 const modules=[
  {...base,id:'obj_371e3a52807c452ea1280dafd434b7e4',moduleRole:'end',gallery:['/assets/beige-sofa-tre-moduler.webp'],price:1.234,weekPrice:5,monthPrice:15},
  {...middle,id:'obj_d9314111959a42bf8b7ca3015af09003',price:0.456,weekPrice:3,monthPrice:7}
 ];
 const quote=sofaCardConfiguration(modules,2);
 assert.equal(quote.price,2.92);assert.equal(quote.selectedTotal,5.84);
 assert.equal(ratePlan(quote,2,modules).total,5.84);
});

test('unpriced selected module suppresses every complete amount; unselected extras are excluded',()=>{
 const modules=products();modules[1].priceOnRequest=true;
 const quote=sofaCardConfiguration(modules,7);
 assert.equal(quote.priceOnRequest,true);assert.deepEqual([quote.price,quote.weekPrice,quote.monthPrice,quote.selectedTotal],[null,null,null,null]);
 const normal=products();normal.push({...middle,id:'not-pictured',priceOnRequest:true});
 assert.equal(sofaCardConfiguration(normal).price,101);
});

test('unknown photos, missing or unavailable-for-rent components never get a guessed complete price',()=>{
 assert.equal(sofaCardConfiguration([]),null);assert.equal(sofaCardConfiguration(null),null);
 for(const changes of [{gallery:['/admin-new-cover.webp']},{category:'Utemøbler'},{active:false},{deletedAt:'2026-10-26'},{rentalEnabled:false},{isPackage:true},{isService:true}]){
  const modules=products();Object.assign(modules[0],changes);assert.equal(sofaCardConfiguration(modules),null,JSON.stringify(changes));
 }
 assert.equal(sofaCardConfiguration([base]),null);
 const differentSeries=products();differentSeries[1].moduleSeries='A different sofa';assert.equal(sofaCardConfiguration(differentSeries),null);
 for(const days of [null,0,-1,1.5,'7',NaN])assert.equal(sofaCardConfiguration(products(),days).selectedTotal,null);
});
