import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {contentHeroAttributes} from '../public/content-hero-image.js';

test('content hero and preload select the same responsive resource before client scripts',async()=>{
 const source=await readFile(new URL('../public/anledning.html',import.meta.url),'utf8');
 for(const key of ['messe','produksjon','bryllup']){
  const model=pageModel('/anledning.html',new URLSearchParams({anledning:key}),[]);
  const html=renderSeo(source,model,[],true);
  const img=html.match(/<section class="production-hero[^]*?<figure>(<img[^>]+>)/)?.[1];
  assert.ok(img,key);
  assert.match(img,/loading="eager"/);assert.match(img,/decoding="sync"/);
  const preload=html.match(/<link rel="preload" as="image"[^>]+>/)?.[0];
  assert.ok(preload);
  for(const [imageAttr,linkAttr]of [['src','href'],['srcset','imagesrcset'],['sizes','imagesizes']]){
   const value=img.match(new RegExp('\\b'+imageAttr+'="([^"]+)"'))?.[1];
   if(value)assert.ok(preload.includes(linkAttr+'="'+value+'"'),key+' '+linkAttr);
  }
  assert.match(html,/data-first-paint="true"/);
 }
});
test('admin media images have responsive candidates; external sources remain untouched',()=>{
 assert.match(contentHeroAttributes('/media/'+'a'.repeat(32)),/thumb=640 640w/);
 assert.equal(contentHeroAttributes('https://example.org/photo.jpg'),'');
});
