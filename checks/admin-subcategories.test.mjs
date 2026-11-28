import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {foldProductSearch} from '../public/product-brand.js';
import {productSubcategory,subcategoryOptions} from '../public/catalog-subcategories.js?v=fest20261114';
import {categoryLabel,subcategoryLabel,configureSiteSettings,defaultSettings} from '../public/site-settings.js?v=produktvalg2';

const settings=structuredClone(defaultSettings);
settings.categories.find(c=>c.id==='Stoler').subcategories.find(s=>s.id==='Barkrakker').label='Barstoler';
configureSiteSettings(settings);
const source=readFileSync(new URL('../public/admin/admin.js',import.meta.url),'utf8');
const products=[
 {id:'dining',name:'Spisestol',category:'Stoler',active:true},
 {id:'bar',name:'Hübsch Folk barstol',category:'Stoler',active:true},
 {id:'hidden',name:'Hübsch Stilt barstol',category:'Stoler',active:false},
 {id:'manual',name:'Spisestol med manuelt valg',category:'Stoler',subcategory:'Barkrakker',active:true},
 {id:'table',name:'Barbord',category:'Bord',active:true},
 {id:'deleted',name:'Barstol',category:'Stoler',deletedAt:'today',active:true}
];
function setup(){
 const fields={filterKind:{value:''},filterStock:{value:''},stockOnly:{checked:false},adminSearch:{value:''},searchAll:{checked:true},adminSubcategoryPanel:{},adminSubcategoriesTitle:{},adminSubcategories:{}};
 const state={foldProductSearch,products,tab:'products',categoryFilter:'Stoler',subcategoryFilter:'Barkrakker',el:id=>fields[id],productSubcategory,subcategoryOptions,categoryLabel,subcategoryLabel,escape:String,isServiceOffering:p=>p.offeringType==='service',isWall:p=>!!p.wallGroup,adminCategory:p=>p.category,matchesArea:(p,area)=>!p.deletedAt,matchesWorkflowFilter:()=>true};
 vm.createContext(state);
 for(const [start,end] of [['function matchesStockFilter(p)', 'function adminThumbnail(p)'],['function availableStock(p)', 'function renderCategories()'],['function renderSubcategories()','function selectVisible()']])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),state);
 return {state,fields,ids:()=>Array.from(state.visibleItems(),p=>p.id)};
}
test('admin chair filter includes hidden and manually assigned products without mixing other categories',()=>{
 const {state,ids}=setup();assert.deepEqual(ids(),['bar','hidden','manual']);
 state.subcategoryFilter='';assert.deepEqual(ids(),['dining','bar','hidden','manual']);
 state.subcategoryFilter='Barkrakker';state.matchesWorkflowFilter=p=>p.active;assert.deepEqual(ids(),['bar','manual']);
 state.categoryFilter='Alle';assert.deepEqual(ids(),['dining','bar','manual','table']);
});
test('scoped search intersects subcategory; explicit global search bypasses it',()=>{
 const {state,fields,ids}=setup();fields.adminSearch.value='  Spisestol  ';fields.searchAll.checked=false;
 assert.deepEqual(ids(),['manual']);fields.searchAll.checked=true;assert.deepEqual(ids(),['dining','manual']);
 state.renderSubcategories();assert.equal(fields.adminSubcategoryPanel.hidden,true);
 fields.adminSearch.value=' ';assert.deepEqual(ids(),['bar','hidden','manual']);
});
test('subcategory buttons count hidden products and use the configured Barstoler label',()=>{
 const {state,fields}=setup();state.renderSubcategories();
 assert.equal(fields.adminSubcategoryPanel.hidden,false);
 assert.match(fields.adminSubcategories.innerHTML,/data-admin-subcategory="Barkrakker" aria-pressed="true"><span>Barstoler<\/span><small>3<\/small>/);
 assert.match(fields.adminSubcategories.innerHTML,/Alle i kategorien<\/span><small>4<\/small>/);
 state.tab='services';state.renderSubcategories();assert.equal(fields.adminSubcategoryPanel.hidden,true);
 state.tab='products';state.categoryFilter='Annet';state.subcategoryFilter='';state.renderSubcategories();assert.equal(fields.adminSubcategoryPanel.hidden,true);
});

test('stock filter uses remaining physical stock and combines with subcategory and status',()=>{
 const {state,fields,ids}=setup();
 state.products=products.map(p=>({...p,stock:2,unavailable:0}));
 state.products.find(p=>p.id==='bar').unavailable=2;
 state.products.find(p=>p.id==='manual').stock=0;
 fields.stockOnly.checked=true;
 assert.deepEqual(ids(),['hidden']);
 state.renderSubcategories();
 assert.match(fields.adminSubcategories.innerHTML,/Alle i kategorien<\/span><small>2<\/small>/);
 assert.match(fields.adminSubcategories.innerHTML,/Barstoler<\/span><small>1<\/small>/);
 state.matchesWorkflowFilter=p=>p.active;
 assert.deepEqual(ids(),[]);
 fields.stockOnly.checked=false;
 assert.deepEqual(ids(),['bar','manual']);
});
test('stock filter excludes non-stock offerings but does not filter service and package tabs',()=>{
 const {state,fields}=setup();fields.stockOnly.checked=true;
 for(const p of [{},{stock:0},{stock:1,unavailable:2},{stock:2,isService:true},{stock:2,isPackage:true},{stock:2,offeringType:'service'},{stock:2,wallGroup:'Wall'}])assert.equal(state.matchesStockFilter(p),false);
 assert.equal(state.matchesStockFilter({stock:3,unavailable:1,active:false}),true);
 assert.equal(state.matchesStockFilter({stock:3,rentalEnabled:false}),true);
 state.tab='services';assert.equal(state.matchesStockFilter({isService:true}),true);
 state.tab='packages';assert.equal(state.matchesStockFilter({isPackage:true}),true);
});
