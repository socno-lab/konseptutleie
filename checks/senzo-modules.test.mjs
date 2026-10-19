import assert from 'node:assert/strict';
import {moduleConfiguration,modulePreset} from '../public/catalog-model.js';
import {saveSofa} from '../public/sofa-model.js';
const common={moduleSeries:'Senzo',active:true,stock:1,unavailable:0,price:500,weekPrice:1000,monthPrice:1750,moduleWidth:110};
const products=[{...common,id:'left',moduleRole:'left',moduleRequired:true},{...common,id:'right',moduleRole:'right',moduleRequired:true},{...common,id:'mid',moduleRole:'middle',stock:2,moduleWidth:81,price:440,weekPrice:870,monthPrice:1510}];
for(const selection of [{mid:1},{left:1},{left:1,mid:1},{left:1,right:1,mid:3}])assert.equal(moduleConfiguration('Senzo',selection,{},products).valid,false);
for(let mid=0;mid<=2;mid++){const selection={left:1,right:1,mid};const c=moduleConfiguration('Senzo',selection,{},products);assert.equal(c.valid,true);assert.equal(c.width,220+81*mid);assert.equal(c.price,1000+440*mid);assert.ok(saveSofa([],{},products,{id:'setup',series:'Senzo',selection}));}
assert.equal(saveSofa([],{},products,{id:'invalid',series:'Senzo',selection:{mid:1}}),null);
assert.equal(saveSofa([],{left:1},products,{id:'occupied',series:'Senzo',selection:{left:1,right:1}}),null);
console.log('Senzo required ends and shared stock passed.');

const paired=[{...common,id:'pair',moduleRole:'base',moduleWidth:220,moduleRequired:true,price:1000,weekPrice:2000,monthPrice:3500},products[2]];
for(let mid=0;mid<=2;mid++){const s={pair:1,mid};const c=moduleConfiguration('Senzo',s,{},paired);assert.equal(c.valid,true);assert.equal(c.count,2+mid);assert.equal(c.width,220+81*mid);assert.equal(c.price,1000+440*mid);assert.ok(saveSofa([],{},paired,{id:'pair-setup',series:'Senzo',selection:s}));}
assert.equal(moduleConfiguration('Senzo',{mid:2},{},paired).valid,false);
assert.equal(moduleConfiguration('Senzo',{pair:2},{},paired).valid,false);
assert.deepEqual(modulePreset(paired,2,2),{pair:1,mid:2});
