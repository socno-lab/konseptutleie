import test from 'node:test';
import assert from 'node:assert/strict';
import {packageCartView,changePackageItem,removePackageGroup,packageGroupPeriodTotal,validPackageBasket} from '../public/package-cart-model.js';
import {rentalEstimate,remaining} from '../public/catalog-model.js';
import {rentalDeliveryCapacity} from '../public/delivery-model.js';
const item=(id,extra={})=>({id,name:id,category:'Stoler',type:'chair',active:true,stock:30,unavailable:0,price:100,weekPrice:500,monthPrice:1000,...extra});
const products=[item('chair'),item('table',{category:'Bord'}),item('plant',{category:'Kunstige planter'}),item('decor',{category:'Dekor'}),item('pack',{name:'Loungepakken',category:'Pakker',isPackage:true,components:[{id:'chair',quantity:2},{id:'table',quantity:1}],price:200,weekPrice:900,monthPrice:1800,relatedAddOns:['decor']}),item('other',{isPackage:true,components:[{id:'chair',quantity:1}]})];
test('fixed package products are visible with multiplied quantities, without duplicate inventory or price',()=>{
 const basket={pack:3,chair:1};const view=packageCartView(basket,products);
 assert.deepEqual(view.groups[0].selection,{chair:6,table:3});assert.deepEqual(view.loose,{chair:1});
 assert.equal(remaining('chair',basket,products),23);assert.equal(rentalEstimate(basket,products,'2026-11-01','2026-11-01').total,700);
});
test('editing one group preserves independent quantities and switches to item prices',()=>{
 const next=changePackageItem({pack:2,chair:1},products,[],'fixed:pack','chair',3);
 assert.deepEqual(next.basket,{chair:4,table:2});const view=packageCartView(next.basket,products,next.groups);
 assert.deepEqual(view.loose,{chair:1});assert.equal(view.groups[0].custom,true);assert.equal(view.groups[0].name,'Loungepakken');
 assert.equal(rentalEstimate(next.basket,products,'2026-11-01','2026-11-01').total,600);
 const removed=removePackageGroup(next.basket,products,next.groups,view.groups[0].id);assert.deepEqual(removed.basket,{chair:1});assert.deepEqual(removed.groups,[]);
});
test('removing a child removes only that group allocation, and removing all children empties it',()=>{
 let next=changePackageItem({pack:1,chair:2},products,[],'fixed:pack','chair',0);
 assert.deepEqual(next.basket,{chair:2,table:1});assert.deepEqual(packageCartView(next.basket,products,next.groups).loose,{chair:2});
 next=changePackageItem(next.basket,products,next.groups,next.groups[0].id,'table',0);assert.deepEqual(next.basket,{chair:2});assert.deepEqual(next.groups,[]);
});
test('shared stock is enforced across different packages and loose products',()=>{
 const ps=products.map(p=>p.id==='chair'?{...p,stock:4}:p);const basket={pack:1,other:1,chair:1};
 assert.equal(changePackageItem(basket,ps,[],'fixed:pack','chair',3),null);
 assert.ok(changePackageItem(basket,ps,[],'fixed:pack','chair',1));
});
test('optional linked add-ons belong to the group, while extra loose units remain separate',()=>{
 const links={decor:{parentId:'pack'}};const basket={pack:2,decor:3,chair:1};
 const view=packageCartView(basket,products,[],links);assert.deepEqual(view.groups[0].extras,{decor:2});assert.equal(view.loose.decor,1);
 assert.deepEqual(removePackageGroup(basket,products,[],'fixed:pack',links).basket,{decor:1,chair:1});
 const next=changePackageItem(basket,products,[],'fixed:pack','table',1,links);assert.equal(next.groups[0].selection.decor,2);assert.equal(packageCartView(next.basket,products,next.groups,links).loose.decor,1);
});
test('custom group survives a reload and a later fixed batch can be edited without losing either',()=>{
 let next=changePackageItem({pack:1},products,[],'fixed:pack','chair',1);
 const saved=JSON.parse(JSON.stringify(next.groups));next=changePackageItem({...next.basket,pack:1},products,saved,'fixed:pack','table',0);
 const view=packageCartView(next.basket,products,next.groups);assert.equal(view.groups.length,1);assert.deepEqual(view.groups[0].selection,{chair:3,table:1});assert.deepEqual(view.loose,{});
});
test('stale or malformed group metadata never invents quantities or claims deleted products',()=>{
 const saved=[{id:'custom:pack',packageId:'pack',selection:{chair:7,missing:2}},{id:'custom:pack',packageId:'pack',selection:{chair:1}},{id:'bad',selection:{chair:1}}];
 const view=packageCartView({chair:2},products,saved);assert.equal(view.groups.length,1);assert.deepEqual(view.groups[0].selection,{chair:2});assert.deepEqual(view.loose,{});
});
test('custom group period price optimises each item and unknown prices are never shown as free',()=>{
 const ps=[item('a',{price:20,weekPrice:25}),item('b',{price:1,weekPrice:20})];
 const group={custom:true,selection:{a:1,b:1}};assert.equal(packageGroupPeriodTotal(group,ps,7),32);
 assert.equal(packageGroupPeriodTotal(group,[ps[0],{...ps[1],priceOnRequest:true}],7),null);
});
test('removal cannot orphan required add-ons',()=>{
 const ps=[...products,item('required',{addonOnly:true,requiredProductId:'chair',requiredProductQuantity:1})];
 assert.equal(changePackageItem({pack:1,required:1},ps,[],'fixed:pack','chair',0),null);
 assert.equal(removePackageGroup({pack:1,required:1},ps,[],'fixed:pack'),null);
});
test('freight limits count current actual products after customisation',()=>{
 const next=changePackageItem({pack:5},products,[],'fixed:pack','chair',1);
 assert.equal(rentalDeliveryCapacity({pack:5},products).manual,true);
 assert.equal(rentalDeliveryCapacity(next.basket,products).manual,false);
 assert.equal(validPackageBasket(next.basket,products),true);
});
test('explicit optional allocation never consumes identical independently added products',()=>{
 const links={decor:{parentId:'pack',packageQuantity:1}};
 const next=removePackageGroup({pack:3,decor:4},products,[],'fixed:pack',links);
 assert.deepEqual(next.basket,{decor:3});
});
test('different packages can own separate allocations of the same optional product',()=>{
 const ps=products.map(p=>p.id==='other'?{...p,relatedAddOns:['decor']}:p);
 const links={decor:{parentId:'other',packageAllocations:{pack:2,other:1}}};
 const basket={pack:2,other:1,decor:5};const view=packageCartView(basket,ps,[],links);
 assert.equal(view.groups.find(g=>g.packageId==='pack').extras.decor,2);assert.equal(view.groups.find(g=>g.packageId==='other').extras.decor,1);assert.equal(view.loose.decor,2);
 const removed=removePackageGroup(basket,ps,[],'fixed:pack',links);assert.deepEqual(removed.basket,{other:1,decor:3});
 const after=packageCartView(removed.basket,ps,[],links);assert.equal(after.groups[0].extras.decor,1);assert.equal(after.loose.decor,2);
});
