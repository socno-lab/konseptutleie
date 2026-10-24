import test from 'node:test';
import assert from 'node:assert/strict';
import {orderRentalCards} from '../public/catalog-order-model.js';

const ids=cards=>cards.map(card=>card.id);

test('All shows ordinary products, services and grouped cards before ready packages, preserving each order',()=>{
 const cards=[
  {id:'lounge',isPackage:true,product:{isPackage:true,name:'Loungepakken'}},
  {id:'sofa',isPackage:false,products:[{id:'sofa-left',moduleSeries:'Sofa'},{id:'sofa-right',moduleSeries:'Sofa'}]},
  {id:'chair',isPackage:false,product:{category:'Stoler'}},
  {id:'styling',isPackage:false,product:{offeringType:'service'}},
  {id:'meeting-package',isPackage:true,product:{isPackage:true}},
  {id:'bed',isPackage:false,product:{isPackage:true,category:'Senger'}},
  {id:'tableware',isPackage:false,product:{isPackage:true,category:'Servise'}},
  {id:'wall',isPackage:false,products:[{wallGroup:'Bildevegg'}]}
 ];
 const before=structuredClone(cards);Object.freeze(cards);for(const card of cards)Object.freeze(card);
 const ordered=orderRentalCards(cards,'alle','Alle');
 assert.deepEqual(ids(ordered),['sofa','chair','styling','bed','tableware','wall','lounge','meeting-package']);
 assert.deepEqual(cards,before);assert.notEqual(ordered,cards);
 for(const card of ordered)assert.equal(card,cards.find(source=>source.id===card.id));
 assert.equal(ordered[0].products,cards[1].products);
});

test('explicit admin ordering overrides the default package position and uses visible grouped member priorities',()=>{
 const cards=[
  {id:'ordinary-package',isPackage:true,product:{isPackage:true}},
  {id:'chair',product:{purposeOrder:{alle:0}}},
  {id:'module-series',products:[{purposeOrder:{alle:8}},{purposeOrder:{alle:2}}]},
  {id:'service',product:{offeringType:'service',purposeOrder:{alle:0}}},
  {id:'preferred-package',isPackage:true,products:[{purposeOrder:{alle:4}},{purposeOrder:{alle:-1}}]}
 ];
 const before=structuredClone(cards);
 assert.deepEqual(ids(orderRentalCards(cards,'alle','Alle')),['preferred-package','chair','service','module-series','ordinary-package']);
 assert.deepEqual(ids(orderRentalCards(cards,'messe','Alle')),['chair','module-series','service','ordinary-package','preferred-package']);
 assert.deepEqual(cards,before);
});

test('the Packages category retains package-first ordering and its wedding/tableware order exception',()=>{
 const cards=[
  {id:'tableware',isPackage:false,product:{isPackage:true,category:'Servise'}},
  {id:'styling',product:{offeringType:'service'}},
  {id:'lounge',isPackage:true,product:{isPackage:true}},
  {id:'meeting',isPackage:true,product:{isPackage:true}}
 ];
 assert.deepEqual(ids(orderRentalCards(cards,'messe','Pakker')),['lounge','meeting','tableware','styling']);
 assert.deepEqual(orderRentalCards(cards,'fest','Pakker'),cards);
 assert.deepEqual(ids(orderRentalCards(cards,'fest','Bord')),['lounge','meeting','tableware','styling']);
 assert.deepEqual(ids(cards),['tableware','styling','lounge','meeting']);
});

test('Christmas fallback stays first in All, and admin choices remain stronger than that fallback',()=>{
 const cards=[
  {id:'lounge',isPackage:true,product:{isPackage:true,name:'Loungepakken'}},
  {id:'legacy-tree',isPackage:true,product:{isPackage:true,name:'Klart til jul – 180 cm'}},
  {id:'chair',product:{}},
  {id:'tree-service',product:{offeringType:'service',serviceGroup:'Klart til jul'}}
 ];
 assert.deepEqual(ids(orderRentalCards(cards,'jul','Alle')),['tree-service','legacy-tree','chair','lounge']);
 assert.deepEqual(ids(orderRentalCards(cards,'alle','Alle')),['chair','tree-service','lounge','legacy-tree']);
 const preferred={id:'preferred-package',isPackage:true,product:{isPackage:true,purposeOrder:{jul:9}}};
 assert.deepEqual(ids(orderRentalCards([...cards,preferred],'jul','Alle')),['preferred-package','tree-service','legacy-tree','chair','lounge']);
});

test('the festive package exception still applies explicit admin priority without mutating descriptors',()=>{
 const cards=[{id:'tableware',product:{category:'Servise'}},{id:'package',isPackage:true,product:{isPackage:true,purposeOrder:{fest:0}}},{id:'service',product:{offeringType:'service'}}],before=structuredClone(cards);
 assert.deepEqual(ids(orderRentalCards(cards,'fest','Pakker')),['package','tableware','service']);
 assert.deepEqual(cards,before);
 assert.deepEqual(orderRentalCards([],'alle','Alle'),[]);
 assert.throws(()=>orderRentalCards(null,'alle','Alle'),TypeError);
});
