import test from 'node:test';import assert from 'node:assert/strict';
import {catalogImageFrame,frameCatalogMarkup,productImageType,imageFrameRules} from '../public/catalog-image-framing.js';
import {catalogImageBounds} from '../public/catalog-image-bounds.js';
import {renderCatalogCard} from '../public/catalog-card-markup.js';
test('source-bound framing keeps the complete measured object inside mobile and desktop cards',()=>{
 for(const src of Object.keys(catalogImageBounds))for(const [category,name] of [['Stoler','Spisestol'],['Bord','Bord'],['Hyller','Skap'],['Sofaer','Sofa'],['Belysning','Bordlampe'],['Tepper','Teppe']]){
  const f=catalogImageFrame({category,name,image:src}),[w,h,l,t,r,b]=f.bounds;
  assert.ok(w>0&&h>0&&l>=0&&t>=0&&r<=w&&b<=h&&r>l&&b>t);
  for(const [cw,ch] of [[138,115],[173,144],[273,228],[300,300]]){
   const iw=Math.min(cw*f.width/100,ch*f.height/100),ih=iw*h/w;
   const left=cw/2+iw*f.x/100+iw*l/w,right=left+iw*(r-l)/w;
   const bottom=ch*(1-f.bottom/100),top=bottom-ih*(b-t)/h;
   assert.ok(left>=-0.01&&right<=cw+.01&&top>=-.01&&bottom<=ch+.01,src);
  }
 }
});
test('unknown uploads, packages and module compositions retain safe original framing',()=>{
 const image=Object.keys(catalogImageBounds)[0],base={category:'Stoler',name:'Stol',image};
 assert.equal(catalogImageFrame({...base,image:'/media/new-upload'}),null);
 assert.equal(productImageType({...base,isPackage:true}),'');
 for(const markup of ['<article data-build="x"><img src="x"></article>','<img class="sofa-card-image" src="x">'])assert.equal(frameCatalogMarkup(markup,base),markup);
});
test('framing exists in the first paint hash, retains image priority and is stable',()=>{
 const p={category:'Stoler',name:'Stol',image:Object.keys(catalogImageBounds)[0]};const card={product:p,render:()=>'<article><img src="'+p.image+'" loading="lazy"></article>'};
 const a=renderCatalogCard(card,0);assert.match(a,/data-image-frame="chair"/);assert.match(a,/loading="eager"/);assert.match(a,/fetchpriority="high"/);assert.equal(a,renderCatalogCard(card,0));
 assert.notEqual(renderCatalogCard({...card,product:{...p,category:'Bord'}},0),a);
});
