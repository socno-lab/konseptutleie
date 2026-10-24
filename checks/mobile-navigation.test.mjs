import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderMobileNavigation} from '../server/mobile-navigation.mjs';
import {publicHtmlNames,readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';

const headerOf=html=>html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0]||'';
const countClass=(html,name)=>(html.match(new RegExp('class="[^"]*\\b'+name+'\\b[^"]*"','g'))||[]).length;
const linksOf=html=>[...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(([,href,label])=>[href,label]);
const fixture=(sale=false)=>'<!doctype html><html><head><title>Eksempel</title></head><body><header class="original-header" data-keep="yes"><a class="brand" href="/" aria-label="Hjem"><img src="/logo.png" alt="Konseptuell" width="2172" height="724"></a><nav aria-label="Hovedmeny"><a href="/">Leie</a><a href="/kjop.html" aria-current="page">Kjøpe</a><a class="packages-nav" href="/utvalg.html?bruk=alle&amp;kategori=Pakker#utvalg">Pakker &amp; tjenester</a></nav><button class="bag" id="'+(sale?'openSaleCart':'openCart')+'">'+(sale?'Handlekurv':'Din forespørsel')+' <span id="'+(sale?'saleCount':'count')+'">3</span> ↗</button></header><main>Innhold</main><footer>Konseptuell</footer></body></html>';

function assertClosedShell(html,context){
 const header=headerOf(html);
 assert.ok(header,context+' retains its header');
 assert.match(header,/^<header\b[^>]*class="[^"]*\bhas-mobile-menu\b/);
 assert.equal(countClass(html,'mobile-menu-toggle'),1,context+' has exactly one initial menu button');
 assert.match(header,/<button\b[^>]*class="mobile-menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="mobileMenuPanel"[^>]*><svg\b/);
 assert.equal(countClass(html,'mobile-menu-layer'),1,context+' has exactly one initial menu layer');
 assert.match(html,/<div\b[^>]*class="mobile-menu-layer"[^>]*\bhidden(?:\s|>)/);
 assert.equal((html.match(/id="mobileMenuPanel"/g)||[]).length,1,context+' has one controlled panel');
 assert.ok(html.indexOf('class="mobile-menu-layer"')>html.indexOf('</header>'),context+' keeps the hidden layer outside the header');
}

test('server markup contains the final closed mobile header and basket before JavaScript',()=>{
 for(const sale of [false,true]){
  const source=fixture(sale),html=renderMobileNavigation(source),header=headerOf(html),id=sale?'openSaleCart':'openCart',countId=sale?'saleCount':'count';
  assertClosedShell(html,id);
  assert.match(header,/class="original-header has-mobile-menu" data-keep="yes"/);
  assert.equal(countClass(header,'mobile-bag-icon'),1);
  assert.equal(countClass(header,'mobile-bag-label'),1);
  assert.equal(countClass(header,'icon-arrow-up-right'),1);
  assert.ok(header.includes('<span id="'+countId+'">3</span>'),id+' preserves the saved count node');
  assert.equal((header.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' preserves the basket identity');
  assert.deepEqual(linksOf(header),linksOf(headerOf(source)),id+' preserves navigation and brand links');
  assert.doesNotMatch(header,/↗/,id+' does not depend on a later arrow-icon conversion');
  assert.ok(html.includes('<main>Innhold</main><footer>Konseptuell</footer>'));
 }
});

test('rendering an existing mobile shell again preserves it without duplicate controls or layers',()=>{
 for(const sale of [false,true]){
  const once=renderMobileNavigation(fixture(sale)),twice=renderMobileNavigation(once);
  assert.equal(twice,once);
  assertClosedShell(twice,sale?'purchase':'rental');
 }
 assert.equal(renderMobileNavigation('<main>Ingen header</main>'),'<main>Ingen header</main>');
 const unrelated='<header><h1>Administrasjon</h1></header><main>Innhold</main>';
 assert.equal(renderMobileNavigation(unrelated),unrelated);
});

test('every public HTML response includes its closed shell while preserving basket and navigation hooks',async()=>{
 for(const name of publicHtmlNames){
  const html=await readHtmlTemplate(name),header=headerOf(html);
  assertClosedShell(html,name);
  assert.match(header,/<a class="brand" href="\/"/);
  assert.ok(linksOf(header).some(([href,label])=>href==='/'&&label==='Leie'),name+' keeps the rental link');
  assert.ok(linksOf(header).some(([href,label])=>href==='/kjop.html'&&label==='Kjøpe'),name+' keeps the purchase link');
  if(name!=='kundeinfo.html'){
   const sale=['kjop.html','kjopsprodukt.html'].includes(name),id=sale?'openSaleCart':'openCart',countId=sale?'saleCount':'count';
   assert.ok(header.includes('id="'+id+'"'),name+' keeps the basket button hook');
   assert.ok(header.includes('<span id="'+countId+'">…</span>'),name+' reserves the unknown basket count');
   assert.equal(countClass(header,'mobile-bag-icon'),1,name+' has its basket icon before hydration');
   assert.equal(countClass(header,'mobile-bag-label'),1,name+' has a responsive basket label before hydration');
   assert.equal(countClass(header,'icon-arrow-up-right'),1,name+' has its desktop arrow before hydration');
   assert.doesNotMatch(header,/↗/);
  }
  assert.equal(renderMobileNavigation(html),html,name+' already has a complete shell');
 }
});

test('temporary furnishing page retains the attributed mobile header during SEO extraction',async()=>{
 const source=await readHtmlTemplate('index.html'),model=pageModel('/midlertidig-moblering.html',new URLSearchParams(),[]),html=renderSeo(source,model,[],true),header=headerOf(html);
 assert.match(header,/\bhas-mobile-menu\b/);
 assert.equal(countClass(header,'mobile-menu-toggle'),1);
 assert.equal((html.match(/<header\b/g)||[]).length,1);
 assert.ok(linksOf(header).some(([href])=>href==='/kjop.html'));
 assert.match(html,/<h1>Midlertidig møblering med møbler til leie<\/h1>/);
});

test('static 404 response also carries the initial mobile menu shell',async()=>{
 const html=await readFile(new URL('../public/404.html',import.meta.url),'utf8');
 assertClosedShell(html,'404');
 assert.match(html,/<h1>Siden finnes ikke<\/h1>/);
 assert.ok(linksOf(headerOf(html)).some(([href])=>href==='/kjop.html'));
 assert.equal(renderMobileNavigation(html),html);
});
