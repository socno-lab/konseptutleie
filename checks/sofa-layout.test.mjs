import test from 'node:test';
import assert from 'node:assert/strict';
import {sofaLayoutError,moduleQuantityLimit} from '../public/sofa-layout.js';
import {moduleConfiguration} from '../public/catalog-model.js';
import {saveSofa,restoreSofas} from '../public/sofa-model.js';
const make=(id,moduleRole)=>({id,moduleRole,moduleSeries:'Test',active:true,stock:10,unavailable:0,moduleWidth:90,price:100});
const modules=[make('left','left'),make('right','right'),make('chaise','right'),make('universal','end'),make('middle','middle')];
test('a sofa has at most one end on each side, including chaise variants',()=>{
 for(const selection of [{left:2},{right:2},{right:1,chaise:1},{universal:3},{left:1,right:1,universal:1}])assert.ok(sofaLayoutError(modules,selection));
 for(const selection of [{left:1,right:1,middle:5},{left:1,universal:1},{universal:2,middle:1},{middle:5}])assert.equal(sofaLayoutError(modules,selection),'');
 assert.equal(moduleQuantityLimit(modules,{right:1},modules[2]),0);
 assert.equal(moduleQuantityLimit(modules,{left:1},modules[3]),1);
 assert.equal(moduleQuantityLimit(modules,{},modules[3]),2);
 assert.equal(moduleQuantityLimit(modules,{},modules[4]),99);
});
test('paired base counts as both ends; validation rejects excess even with ample stock',()=>{
 const paired=[make('base','base'),make('middle','middle')];
 assert.ok(sofaLayoutError(paired,{base:2}));
 assert.equal(moduleQuantityLimit(paired,{},paired[0]),1);
 assert.equal(moduleConfiguration('Test',{universal:3},{},modules).valid,false);
 assert.equal(moduleConfiguration('Test',{left:1,right:1,middle:1},{},modules).valid,true);
});
test('separate sofa setups may each have two ends',()=>{
 const products=[make('universal','end'),make('middle','middle')];
 const one=saveSofa([],{},products,{id:'one',series:'Test',selection:{universal:2,middle:1}});
 const two=saveSofa(one.setups,one.cart,products,{id:'two',series:'Test',selection:{universal:2,middle:1}});
 assert.ok(two);assert.equal(two.cart.universal,4);
 assert.equal(saveSofa([],{},products,{id:'bad',series:'Test',selection:{universal:3}}),null);
});
test('reopening old overfull sofa keeps surplus modules in the ordinary cart',()=>{
 const products=[make('universal','end'),make('middle','middle')];
 const restored=restoreSofas({universal:3,middle:1},[{id:'old',series:'Test',selection:{universal:3,middle:1}}],products);
 assert.equal(restored.setups[0].selection.universal,2);
 assert.equal(restored.cart.universal,3);assert.equal(restored.cart.middle,1);
});
test('rental module minimum combines the series, counts base as two and excludes textiles',async()=>{
 const {moduleRentalMinimum,rentalModuleRequirementError}=await import('../public/sofa-layout.js');
 const lagoon=[{...make('l','left'),rentalModuleMinimum:2},{...make('r','right'),rentalModuleMinimum:2},{...make('c','chaise'),rentalModuleMinimum:2},{id:'textile',active:true,isService:true}];
 assert.equal(moduleRentalMinimum(lagoon),2);
 assert.equal(moduleConfiguration('Test',{l:1},{},lagoon).valid,false);
 assert.equal(moduleConfiguration('Test',{l:1,c:1},{},lagoon).valid,true);
 assert.equal(moduleConfiguration('Test',{l:1,r:1,c:1},{},lagoon).valid,true);
 assert.match(rentalModuleRequirementError({l:1,textile:1},lagoon),/minst 2/);
 assert.equal(rentalModuleRequirementError({l:1,r:1},lagoon),'');
 const pack={id:'pack',isPackage:true,components:[{id:'l',quantity:1}],active:true};
 assert.match(rentalModuleRequirementError({pack:1},[...lagoon,pack]),/minst 2/);
 assert.equal(rentalModuleRequirementError({pack:2},[...lagoon,pack]),'');
 const base=[{...make('base','base'),rentalModuleMinimum:2}];assert.equal(moduleConfiguration('Test',{base:1},{},base).valid,true);
 const saved=saveSofa([],{},lagoon,{id:'a',series:'Test',selection:{l:1},textileId:''});assert.equal(saved,null);
});
