import test from 'node:test';
import assert from 'node:assert/strict';
import {purposeOrderScopes,validatePurposeOrder,sortByPurposeOrder} from '../public/purpose-order-model.js';

test('Purpose priorities are optional, copied and bounded integers, including zero',()=>{
 assert.deepEqual(validatePurposeOrder(undefined),{});
 const source={boligsalg:-9999,messe:0,bedrift:10,fest:9999,jul:2,alle:4};
 const result=validatePurposeOrder(source);
 assert.deepEqual(result,source);
 assert.notEqual(result,source);
 result.jul=20;
 assert.equal(source.jul,2);
 assert.deepEqual(purposeOrderScopes,['boligsalg','messe','bedrift','fest','jul','alle']);
 assert(Object.isFrozen(purposeOrderScopes));
 assert.deepEqual(validatePurposeOrder(Object.assign(Object.create(null),{jul:0})),{jul:0});
});

test('Validation rejects malformed records, unknown scopes and noninteger priorities',()=>{
 for(const value of [null,[],['jul'],42,'jul',new Date(),new Map(),Object.create({jul:1})])assert.throws(()=>validatePurposeOrder(value));
 for(const priority of ['1','',null,undefined,true,false,NaN,Infinity,-Infinity,1.5,-10000,10000,1n,[],{}])assert.throws(()=>validatePurposeOrder({jul:priority}));
 for(const scope of ['event','unknown','__proto__','constructor'])assert.throws(()=>validatePurposeOrder(JSON.parse('{"'+scope+'":1}')));
 assert.equal({}.jul,undefined);
});

test('Cards without priorities retain baseline ordering without mutation',()=>{
 const cards=[{id:'package',product:{isPackage:true}},{id:'modules',products:[{moduleSeries:'Sofa'}]},{id:'service',product:{offeringType:'service'}},{id:'chair',product:{}}];
 const sorted=sortByPurposeOrder(cards,'messe');
 assert.deepEqual(sorted,cards);
 assert.notEqual(sorted,cards);
 assert.equal(sorted[0],cards[0]);
 assert.deepEqual(sortByPurposeOrder(cards,'wrong'),cards);
 assert.throws(()=>sortByPurposeOrder(null,'messe'),TypeError);
});

test('Explicit priorities override package, module and service grouping, with stable ties',()=>{
 const cards=[
  {id:'package',product:{isPackage:true}},
  {id:'module',products:[{moduleSeries:'Sofa',purposeOrder:{messe:5}}]},
  {id:'service',product:{offeringType:'service',purposeOrder:{messe:0}}},
  {id:'chair',product:{purposeOrder:{messe:-2}}},
  {id:'chair-tie',product:{purposeOrder:{messe:0}}},
  {id:'unpinned',product:{}}
 ];
 const original=[...cards];
 assert.deepEqual(sortByPurposeOrder(cards,'messe').map(card=>card.id),['chair','service','chair-tie','module','package','unpinned']);
 assert.deepEqual(cards,original);
 assert.deepEqual(sortByPurposeOrder(cards,'event'),sortByPurposeOrder(cards,'messe'));
 assert.deepEqual(sortByPurposeOrder(cards,'fest'),cards);
});

test('Grouped variants use the lowest member priority and support a visible-member selector',()=>{
 const cards=[{id:'base',product:{}},{id:'service',products:[{purposeOrder:{jul:8}},{purposeOrder:{jul:2}}]},{id:'chair',products:[{purposeOrder:{jul:3}}]}];
 assert.deepEqual(sortByPurposeOrder(cards,'jul').map(card=>card.id),['service','chair','base']);
 const custom=[{id:'sofa',members:[{visible:false,purposeOrder:{fest:-2}},{visible:true}]},{id:'chair',members:[{visible:true,purposeOrder:{fest:3}}]}];
 assert.deepEqual(sortByPurposeOrder(custom,'fest',{productsForCard:card=>card.members.filter(p=>p.visible)}).map(card=>card.id),['chair','sofa']);
 const raw=[{id:'a'},{id:'b',purposeOrder:{alle:0}}];
 assert.deepEqual(sortByPurposeOrder(raw,'alle').map(card=>card.id),['b','a']);
 assert.deepEqual(sortByPurposeOrder(raw,'messe'),raw);
});

test('Christmas fallback supports legacy packages and services only in the Christmas scope',()=>{
 const cards=[
  {id:'ordinary-package',isPackage:true,name:'Loungepakken'},
  {id:'legacy-tree',isPackage:true,name:'Klart til jul – 180 cm'},
  {id:'tree-service',offeringType:'service',serviceGroup:'Klart til jul'},
  {id:'unrelated',offeringType:'product',serviceGroup:'Klart til jul'},
  {id:'similar',isPackage:true,name:'Klart til jul – dekor til bord'},
  {id:'chair'}
 ];
 assert.deepEqual(sortByPurposeOrder(cards,'jul').map(card=>card.id),['legacy-tree','tree-service','ordinary-package','unrelated','similar','chair']);
 assert.deepEqual(sortByPurposeOrder(cards,'messe'),cards);
 assert.deepEqual(sortByPurposeOrder(cards,'alle'),cards);
});

test('Admin priority takes precedence over the Christmas fallback, including the tree itself',()=>{
 const tree={id:'tree',offeringType:'service',serviceGroup:'Klart til jul'};
 const preferred={id:'preferred',purposeOrder:{jul:9}};
 assert.deepEqual(sortByPurposeOrder([tree,{id:'ordinary'},preferred],'jul').map(p=>p.id),['preferred','tree','ordinary']);
 const rankedTree={...tree,purposeOrder:{jul:9999}};
 assert.deepEqual(sortByPurposeOrder([{id:'ordinary'},rankedTree,preferred],'jul').map(p=>p.id),['preferred','tree','ordinary']);
 const group={id:'group',products:[tree,{...tree,purposeOrder:{jul:9999}}]};
 assert.deepEqual(sortByPurposeOrder([group,preferred],'jul').map(p=>p.id),['preferred','group']);
});

test('Unvalidated legacy data cannot accidentally create a priority or change purpose membership',()=>{
 const cards=[{id:'first'},{id:'string',purposeOrder:{jul:'-5'}},{id:'inherited',purposeOrder:Object.create({jul:-9})},{id:'nan',purposeOrder:{jul:NaN}},{id:'hidden',purposes:['messe'],purposeOrder:{jul:0}}];
 const sorted=sortByPurposeOrder(cards,'jul');
 assert.deepEqual(sorted.map(p=>p.id),['hidden','first','string','inherited','nan']);
 assert.deepEqual(sorted[0].purposes,['messe']);
 assert.equal(sorted.length,cards.length);
 assert.deepEqual(cards.map(p=>p.id),['first','string','inherited','nan','hidden']);
});
