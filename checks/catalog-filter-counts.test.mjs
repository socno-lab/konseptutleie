import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogFilters,rentalSubcategoryCounts} from '../public/catalog-filters.js';
import {saleCatalogView} from '../public/sale-catalog-view.js';
import {configureSiteSettings,defaultSettings} from '../public/site-settings.js?v=fest20261114';
const settings=configureSiteSettings(defaultSettings);
const item=(id,name,extra={})=>({id,name,category:'Stoler',subcategory:'Spisestoler',active:true,stock:40,maxQuantity:40,material:'Plast',price:100,saleEnabled:true,salePrice:700,purposesExplicit:true,purposes:['messe'],...extra});
const products=[item('green','Hagestol grønn'),item('beige','Hagestol beige'),item('home','Lenestol beige',{subcategory:'Loungestoler',purposes:['boligsalg']}),item('addon','Tekstil',{addonOnly:true}),item('sofa-a','Sofa hjørne',{category:'Sofaer',subcategory:'Modulsofaer',moduleSeries:'Modulsofa grå'}),item('sofa-b','Sofa midt',{category:'Sofaer',subcategory:'Modulsofaer',moduleSeries:'Modulsofa grå'})];
function number(markup,attribute,value){return Number(markup.match(new RegExp(attribute+'="'+value+'"[^>]*>[^<]*<span[^>]*>\\((\\d+)\\)'))?.[1]);}
test('rental counts follow purpose and search, exclude add-ons, and count a module series once',()=>{
 const before=JSON.stringify(products);
 const markup=catalogFilters(products,settings,'Stoler','messe');
 assert.equal(number(markup,'data-filter','Stoler'),2);
 assert.equal(number(markup,'data-filter','Sofaer'),1);
 assert.equal(number(markup,'data-filter','Alle'),3);
 assert.equal(number(catalogFilters(products,settings,'Sofaer','messe'),'data-filter','Stoler'),2);
 assert.equal(number(catalogFilters(products,settings,'Stoler','boligsalg'),'data-filter','Stoler'),1);
 assert.equal(number(catalogFilters(products,settings,'Stoler','messe','grønn'),'data-filter','Stoler'),1);
 assert.equal(number(catalogFilters(products,settings,'Stoler','messe','zzzz'),'data-filter','Stoler'),0);
 assert.deepEqual(rentalSubcategoryCounts(products,settings,'messe','Stoler','beige',['Spisestoler','Loungestoler']),{'':1,Spisestoler:1,Loungestoler:0});
 assert.equal(JSON.stringify(products),before);
});
test('sale counts retain other categories when a subcategory is selected and follow search',()=>{
 const saleProducts=products.filter(p=>!p.addonOnly);
 const view=saleCatalogView({products:saleProducts,category:'Stoler',tableFilter:'Spisestoler',query:'beige'});
 assert.equal(view.shown.length,1);
 assert.equal(number(view.categoryHtml,'data-sale-category','Stoler'),2);
 assert.equal(number(view.subcategoryHtml,'data-table-type','Loungestoler'),1);
 assert.equal(number(view.subcategoryHtml,'data-table-type',''),2);
 assert.equal(number(saleCatalogView({products:saleProducts,query:'zzzz'}).categoryHtml,'data-sale-category','Stoler'),0);
});
