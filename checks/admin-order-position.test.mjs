import test from 'node:test';
import assert from 'node:assert/strict';
import {moveCardToPosition,positionBounds} from '../public/admin/catalog-order-position.js';
import {rememberCardOrder,applyCatalogOrder} from '../public/catalog-manual-order.js';
const cards=Array.from({length:8},(_,i)=>({product:{id:String(i+1)}}));
const ids=items=>items.map(c=>c.product.id);
test('moving 8 to 1 or 2 shifts intervening cards and preserves every card',()=>{
 for(const position of [1,2]){
  const result=moveCardToPosition(cards,7,position,'alle','Stoler');
  assert.deepEqual(ids(result),position===1?['8','1','2','3','4','5','6','7']:['1','8','2','3','4','5','6','7']);
  assert.equal(result[position-1],cards[7]);
  const saved=rememberCardOrder([],'alle','Stoler',result);
  assert.deepEqual(applyCatalogOrder(cards,'alle','Stoler',saved),result);
 }
 assert.deepEqual(ids(cards),['1','2','3','4','5','6','7','8']);
});
test('moving down, adjacent movement and unchanged position preserve order',()=>{
 assert.deepEqual(ids(moveCardToPosition(cards,0,8,'alle','Alle')),['2','3','4','5','6','7','8','1']);
 assert.deepEqual(ids(moveCardToPosition(cards,1,3,'alle','Alle')),['1','3','2','4','5','6','7','8']);
 assert.deepEqual(moveCardToPosition(cards,2,3,'alle','Alle'),cards);
});
test('invalid positions are rejected without changing the list',()=>{
 for(const position of [0,9,1.5,NaN,Infinity,'2'])assert.throws(()=>moveCardToPosition(cards,0,position,'alle','Alle'));
 for(const index of [-1,8,1.5])assert.throws(()=>moveCardToPosition(cards,index,1,'alle','Alle'));
 assert.throws(()=>moveCardToPosition([],0,1,'alle','Alle'));
});
test('Messe All retains packages first; groups move as a single card',()=>{
 const group={product:{id:'group'},products:[{id:'left'},{id:'right'}]};
 const items=[{product:{id:'p1'},isPackage:true},{product:{id:'p2'},isPackage:true},...cards,group];
 assert.deepEqual(positionBounds(items,0,'messe','Alle'),{min:1,max:2});
 assert.deepEqual(positionBounds(items,4,'messe','Alle'),{min:3,max:11});
 assert.throws(()=>moveCardToPosition(items,4,1,'messe','Alle'));
 assert.throws(()=>moveCardToPosition(items,0,3,'messe','Alle'));
 const result=moveCardToPosition(items,10,3,'messe','Alle');
 assert.equal(result[2],group);
 assert.deepEqual(rememberCardOrder([],'messe','Alle',result)[0].ids.slice(0,5),['p1','p2','left','right','1']);
 assert.equal(moveCardToPosition(items,10,1,'messe','Stoler')[0],group);
});
