import test from 'node:test';import assert from 'node:assert/strict';
import {productFirstPaint} from '../server/product-first-paint.mjs';import {detailImageAttributes,detailImageMarkup,setDetailPhotoSource,detailImageSizes} from '../public/product-image-loading.js';
import {readInitialCatalog} from '../public/catalog-card-markup.js';
const src='/media/12345678901234567890123456789012',template='<html><head></head><body><main></main></body></html>';
test('both product modes deliver public data and preload the exact responsive detail candidate',()=>{
 for(const buy of [false,true]){
  const product={id:'p',image:src,name:'Name </script><script>bad()</script>'},products=[product],settings={};
  const html=productFirstPaint(template,{product,buy,status:200},products,settings);
  assert.match(html,/rel="preload" as="image"/);assert.match(html,/imagesrcset=/);assert.match(html,/fetchpriority="high"/);
  assert.ok(html.includes('imagesizes="'+detailImageSizes+'"'));assert.ok(detailImageAttributes(src).includes('sizes="'+detailImageSizes+'"'));
  const raw=html.match(/id="initialProductCatalog">([\s\S]*?)<\/script>/)[1];assert.ok(!raw.includes('<'));
  assert.deepEqual(readInitialCatalog({getElementById:id=>id==='initialProductCatalog'?{textContent:raw}:null}),{products,settings});
 }
});
test('module compositions and walls receive data without preloading an unrelated product photo',()=>{
 for(const special of [{moduleSeries:'sofa'},{wallGroup:'wall'}]){
  const html=productFirstPaint(template,{product:{image:src,...special},status:200},[],{});assert.doesNotMatch(html,/rel="preload"/);assert.match(html,/initialProductCatalog/);
 }
 assert.equal(productFirstPaint(template,{status:404},[],{}),template);
});
test('main photo hydration keeps the responsive source rather than switching to the original',()=>{
 const attrs={src},img={getAttribute:k=>attrs[k],removeAttribute:k=>delete attrs[k]};let resets=0;Object.defineProperty(img,'src',{set:v=>{attrs.src=v;resets++;}});
 setDetailPhotoSource(img,src);assert.equal(resets,0);assert.equal(img.sizes,detailImageSizes);assert.equal(img.loading,'eager');assert.match(img.srcset,/thumb=1280/);
 const html=detailImageMarkup('<img src="x" sizes="50vw" loading="lazy">');assert.match(html,/loading="eager"/);assert.match(html,/fetchpriority="high"/);assert.ok(html.includes(detailImageSizes));
});
