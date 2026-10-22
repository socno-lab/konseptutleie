import test from 'node:test';
import assert from 'node:assert/strict';
import {productSubcategory,availableSubcategories} from '../public/catalog-subcategories.js';
test('chair and lamp types do not mix across parent categories',()=>{
 for(const [name,category,expected] of [['Hübsch Forma Dining Chair Natural','Stoler','Spisestoler'],['VIND Orust barkrakk','Stoler','Barkrakker'],['Venture Design My loungestol','Stoler','Loungestoler'],['Hübsch Rocco puff','Stoler','Puffer'],['Hübsch BringMe portabel lampe','Belysning','Portable lamper'],['Hübsch Mush bordlampe','Belysning','Bordlamper']])assert.equal(productSubcategory({name,category}),expected);
 assert.equal(productSubcategory({name:'Dining Chair',category:'Stoler'},'Bord'),'');
});
test('only visible sofa types are offered, with module series handled together',()=>{
 const products=[{name:'Senzo midtmodul',category:'Sofaer',moduleSeries:'Senzo'},{name:'Jakobsdals Senza sofa, beige',category:'Sofaer'},{name:'3-seter',category:'Sofaer',active:false},{name:'4-seter',category:'Sofaer',deletedAt:'today'},{name:'3-seter',category:'Sofaer',addonOnly:true}];
 assert.deepEqual(availableSubcategories(products,'Sofaer'),['Modulsofaer','2-setere']);
 assert.deepEqual(availableSubcategories(products.filter(p=>p.moduleSeries),'Sofaer'),['Modulsofaer']);
 assert.deepEqual(availableSubcategories(products,'Stoler'),[]);
});
test('other groups classify existing products by function and shape',()=>{
 for(const [name,category,expected] of [['Herringbone Dresser','Hyller','Kommoder'],['Read Cabinet','Hyller','Skap'],['Fioro teppe Ø80 cm','Tepper','Runde tepper'],['Arianna teppe, 70 × 240 cm','Tepper','Løpere'],['Kunstig pampasgress','Kunstige planter','Gress'],['Kunstig fiolfikus','Kunstige planter','Trær']])assert.equal(productSubcategory({name,category}),expected);
});

test('manual placement survives saving and overrides names in both catalogues',async()=>{
 const {validateCatalog}=await import('../server/catalog.mjs');
 const {publicCatalog}=await import('../app-server.mjs');
 const base={id:'manual_desk',name:'Sofabord med feil modellnavn',category:'Bord',subcategory:'Skrivebord',material:'MDF',description:'',price:10,weekPrice:30,monthPrice:60,stock:2,unavailable:0,active:true,isPackage:false,type:'generic',color:'#ffffff',image:'',isExample:false};
 const saved=validateCatalog([base]);
 assert.equal(saved[0].subcategory,'Skrivebord');
 const visible=publicCatalog({products:saved}).products;
 assert.deepEqual(availableSubcategories(visible,'Bord'),['Skrivebord']);
 assert.equal(productSubcategory(visible[0]),'Skrivebord');
 assert.equal(productSubcategory({...visible[0],subcategory:''}),'Sofabord');
 assert.throws(()=>validateCatalog([{...base,subcategory:'Spisestoler'}]),/Underkategorien/);
 assert.throws(()=>validateCatalog([{...base,category:'Stoler'}]),/Underkategorien/);
 assert.throws(()=>validateCatalog([{...base,subcategory:{name:'Skrivebord'}}]),/Underkategorien/);
 assert.equal(validateCatalog([{...base,subcategory:undefined}])[0].subcategory,'');
});
