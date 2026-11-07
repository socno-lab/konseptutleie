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
  const html=productFirstPaint(template,{product:{image:src,...special},status:200},[],{});assert.doesNotMatch(html,/rel="preload" as="image"/);assert.match(html,/initialProductCatalog/);
 }
 assert.equal(productFirstPaint(template,{status:404},[],{}),template);
});
test('main photo hydration keeps the responsive source rather than switching to the original',()=>{
 const attrs={src},img={getAttribute:k=>attrs[k],removeAttribute:k=>delete attrs[k]};let resets=0;Object.defineProperty(img,'src',{set:v=>{attrs.src=v;resets++;}});
 setDetailPhotoSource(img,src);assert.equal(resets,0);assert.equal(img.sizes,detailImageSizes);assert.equal(img.loading,'eager');assert.match(img.srcset,/thumb=1280/);
 const html=detailImageMarkup('<img src="x" sizes="50vw" loading="lazy">');assert.match(html,/loading="eager"/);assert.match(html,/fetchpriority="high"/);assert.ok(html.includes(detailImageSizes));
});

test('product shell is present before modules, moves rental controls once and sanitizes return links',()=>{
 const template='<head></head><body><main><section><div class="mobile-catalog-usage mobile-catalog-only"><span id="mobileCatalogUsageLabel"></span><button id="mobileChangeUsage">Endre</button></div><div id="catalogPricingScope" class="rental-pricing-scope"></div></section></main></body>';
 for(const buy of [false,true]){
  const html=productFirstPaint(template,{product:{id:'p'},status:200,buy,productReturn:'https://evil.test'},[],{});
  assert.equal((html.match(/id="productPageHost"/g)||[]).length,1);
  assert.equal((html.match(/id="catalogPricingScope"/g)||[]).length,buy?0:1);
  assert.ok(html.indexOf('productPageHost')<html.indexOf('<section>'));
  assert.ok(!html.includes('evil.test'));
  assert.match(html,/product-shell-bootstrap.js\?v=production20261107/);
 }
});

test('parsing-time rental menu agrees with application usage rules including saved choices',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm');
 const {readPurposeState}=await import('../public/rental-purpose-model.js?v=content20261107');
 const {rentalUsageState}=await import('../public/rental-usage-model.js?v=content20261107');
 const source=await readFile(new URL('../public/product-shell-bootstrap.js?v=production20261107',import.meta.url),'utf8');
 for(const purpose of [undefined,'alle','fest','boligsalg','event','invalid'])for(const explicit of [undefined,'messe','standard','invalid'])for(const saved of [null,'standard','messe']){
  const url=new URL('https://konseptuell.no/leieprodukt.html');if(purpose!==undefined)url.searchParams.set('bruk',purpose);if(explicit!==undefined)url.searchParams.set('prisbruk',explicit);
  let actual=null,price=null;const elements={catalogPricingScope:{replaceChildren:value=>actual=value}};
  for(const scope of ['standard','messe']){elements['initialScope-'+scope]={content:{cloneNode:()=>scope},remove(){}};elements['initialProductPrice-'+scope]={content:{cloneNode:()=>scope},remove(){}};}
  runInNewContext(source,{URL,location:{href:url.href},document:{getElementById:id=>elements[id],querySelector:()=>({replaceChildren:value=>price=value})},sessionStorage:{getItem:()=> 'boligsalg'},localStorage:{getItem:()=>saved}});
  const expected=rentalUsageState({purpose:readPurposeState(url.href,'boligsalg').purpose,explicit,saved});
  assert.equal(actual,expected.confirmed?expected.scope:null,url.href+' saved='+saved);assert.equal(price,actual,'first price follows the same usage as the menu');
 }
});
