import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleCardImage} from '../public/module-card-image.js';
import {renderRecommendations} from '../public/product-recommendations.js';

test('rental alternatives show the catalogue sofa cover even when the recommended module has no gallery',()=>{
 const current={id:'current',name:'Sofa',category:'Sofaer',rentalAlternatives:['left']};
 const left={id:'left',name:'Venstre ende',category:'Sofaer',moduleSeries:'Testsofa',moduleRole:'left',image:'/left.webp',gallery:[],active:true,stock:1,unavailable:0,price:100};
 const middle={...left,id:'middle',moduleRole:'middle',image:'/middle.webp',gallery:['/whole-sofa.webp']};
 const section={innerHTML:'',hidden:false},host={querySelector:()=>section};
 renderRecommendations(host,current,[left,middle],'rent',{bruk:'alle',prisbruk:'standard'},id=>'/produkt/'+id);
 assert.equal(moduleCardImage([left,middle]),'/whole-sofa.webp');
 assert.match(section.innerHTML,/<img src="\/whole-sofa.webp"/);
 assert.doesNotMatch(section.innerHTML,/<img src="\/left.webp"/);
 middle.gallery=['/new-admin-cover.webp'];
 renderRecommendations(host,current,[left,middle],'rent',{bruk:'alle',prisbruk:'standard'},id=>'/produkt/'+id);
 assert.match(section.innerHTML,/<img src="\/new-admin-cover.webp"/);
});

test('single products and outdoor modules retain their product photos and missing galleries fall back safely',()=>{
 assert.equal(moduleCardImage([]),'');
 assert.equal(moduleCardImage([{image:'/module.webp'}]),'/module.webp');
 assert.equal(moduleCardImage([{category:'Utemøbler',image:'/outdoor.webp',gallery:['/scene.webp']}]),'/outdoor.webp');
 const p={id:'sofa',name:'Vanlig sofa',category:'Sofaer',active:true,stock:1,unavailable:0,price:100,image:'/product.webp',gallery:['/scene.webp']};
 const section={innerHTML:''};
 renderRecommendations({querySelector:()=>section},{id:'current',category:'Sofaer',rentalAlternatives:['sofa']},[p],'rent',{bruk:'alle',prisbruk:'standard'},id=>'/produkt/'+id);
 assert.match(section.innerHTML,/<img src="\/product.webp"/);
});
