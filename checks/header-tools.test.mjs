import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderHeaderTools,headerToolsLayer} from '../server/header-tools.mjs';
import {renderMobileNavigation} from '../server/mobile-navigation.mjs';
import {publicHtmlNames,readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {enquiryPageHtml} from '../server/enquiry-page.mjs';

const headerOf=html=>html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0]||'';
const tags=(html,name)=>[...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','g'))].map(match=>match[0]);
const countClass=(html,name)=>tags(html,'[a-z][a-z0-9]*').filter(tag=>(tag.match(/\bclass="([^"]*)"/)?.[1]||'').split(/\s+/).includes(name)).length;
const fixture=(buy=false)=>'<!doctype html><html><head><title>Kontroll</title></head><body><header class="original-header" data-preserve="yes"><a class="brand" href="/" aria-label="Hjem"><img src="/logo.png" alt="Konseptuell"></a><nav aria-label="Hovedmeny"><a href="/">Leie</a><a href="/kjop.html">Kjøpe</a><a href="/#skreddersydd">Skreddersydd</a></nav><button class="bag" id="'+(buy?'openSaleCart':'openCart')+'">'+(buy?'Handlekurv':'Din forespørsel')+' <span id="'+(buy?'saleCount':'count')+'">4</span> ↗</button></header><main data-keep="unchanged"><h1>Produkter</h1><section><p>Godkjent innhold</p></section></main><dialog id="cart"><form id="requestForm"><input name="name"></form></dialog><footer>Eksisterende footer</footer></body></html>';

function assertTools(html,context){
 const header=headerOf(html);
 assert.match(header,/\bclass="[^"]*\bhas-header-tools\b/,context+' header is ready before client startup');
 assert.equal(countClass(header,'header-tools'),1,context+' has one tool group');
 assert.equal(countClass(header,'header-tool-button'),2,context+' has search and favorites controls');
 for(const name of ['search','favorites'])assert.equal(tags(header,'button').filter(tag=>tag.includes('data-header-tool="'+name+'"')&&tag.includes('aria-expanded="false"')&&tag.includes('aria-controls="headerToolsPanel"')).length,1,context+' initially closed '+name+' control');
 assert.equal(countClass(html,'header-tools-layer'),1,context+' has one layer');
 assert.match(html,/<div class="header-tools-layer" hidden>/);
 for(const id of ['headerToolsPanel','headerToolsTitle','headerSearch'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,context+' has one '+id);
 assert.match(html,/<section\b[^>]*id="headerToolsPanel"[^>]*role="dialog"[^>]*aria-labelledby="headerToolsTitle"/);
 assert.match(html,/<label for="headerSearch">Søk i hele utvalget<\/label>/);
 assert.ok(html.indexOf('class="header-tools-layer"')>html.indexOf('</header>'),context+' layer stays outside header');
 assert.equal(renderHeaderTools(html),html,context+' is idempotent');
}

test('header tools preserve navigation, cart identity and all content outside their shell',()=>{
 for(const buy of [false,true]){
  const before=renderMobileNavigation(fixture(buy)),after=renderHeaderTools(before),originalHeader=headerOf(before),header=headerOf(after);
  assertTools(after,buy?'buy':'rent');
  assert.match(header,/data-preserve="yes"/);
  assert.equal(header.match(/<nav\b[\s\S]*?<\/nav>/)?.[0],originalHeader.match(/<nav\b[\s\S]*?<\/nav>/)?.[0]);
  assert.equal(header.match(/<button class="bag"[\s\S]*?<\/button>/)?.[0],originalHeader.match(/<button class="bag"[\s\S]*?<\/button>/)?.[0]);
  assert.ok(header.includes('<span id="'+(buy?'saleCount':'count')+'">4</span>'));
  assert.equal(after.replace(header,'').replace(headerToolsLayer,''),before.replace(originalHeader,''),'existing main, dialog, footer and document structure are unchanged');
  assert.match(after,/<\/header><div class="mobile-menu-layer" hidden>/,'mobile menu remains immediate header sibling');
 }
});

test('unrelated admin headers and documents without a storefront header receive no tools',()=>{
 for(const html of ['<html><body><main>Ingen header</main></body></html>','<html><body><header><h1>Admin</h1></header><main>Innhold</main></body></html>'])assert.equal(renderHeaderTools(html),html);
});

test('every public template has one initial tool shell and keeps its existing navigation and basket hooks',async()=>{
 for(const name of publicHtmlNames){
  const html=await readHtmlTemplate(name),header=headerOf(html);
  assertTools(html,name);
  assert.equal((html.match(/src="\/header-tools\.js\?[^" ]+"/g)||[]).length,1,name+' loads one controller');
  assert.equal((html.match(/href="\/header-tools\.css\?[^" ]+"/g)||[]).length,1,name+' loads its styles');
  assert.match(header,/<a class="brand" href="\/"/);
  assert.match(header,/<nav\b[^>]*>[\s\S]*?<a href="\/">Leie<\/a>/);
  assert.match(header,/<a href="\/kjop\.html"[^>]*>Kjøpe<\/a>/);
  assert.match(html,/<\/header><div class="mobile-menu-layer" hidden>/);
  if(name!=='kundeinfo.html'){
   const buy=['kjop.html','kjopsprodukt.html'].includes(name);
   assert.equal((header.match(new RegExp('id="'+(buy?'openSaleCart':'openCart')+'"','g'))||[]).length,1);
   assert.ok(header.includes('<span id="'+(buy?'saleCount':'count')+'">0</span>'),name+' keeps an empty-basket fallback for the synchronous saved-count bootstrap');
  }
 }
});

test('rental and purchase enquiry transforms retain usable header tools without changing the form bootstrap',async()=>{
 for(const mode of ['rent','buy']){
  const html=enquiryPageHtml(await readHtmlTemplate(mode==='buy'?'kjop.html':'utvalg.html'),mode);
  assertTools(html,mode+' enquiry');
  assert.match(html,mode==='buy'?/id="saleRequestForm"/:/id="requestForm"/);
  assert.match(html,/data-enquiry-page="true"/);
 }
});

test('SEO furnishing-page reconstruction retains the entire tools panel and its script/style references',async()=>{
 const source=await readHtmlTemplate('index.html'),model=pageModel('/midlertidig-moblering.html',new URLSearchParams(),[]),html=renderSeo(source,model,[],true);
 assertTools(html,'temporary furnishing');
 assert.ok(html.includes(headerToolsLayer),'external tool panel survives reconstruction');
 assert.match(html,/<script type="module" src="\/header-tools\.js\?/);
 assert.match(html,/<link rel="stylesheet" href="\/header-tools\.css\?/);
 assert.match(html,/<h1>Midlertidig møblering med møbler til leie<\/h1>/);
 assert.equal((html.match(/<header\b/g)||[]).length,1);
});

test('static 404 retains its recovery links and exposes the same closed header tools',async()=>{
 const html=await readFile(new URL('../public/404.html',import.meta.url),'utf8');
 assertTools(html,'404');
 assert.match(html,/<h1>Siden finnes ikke<\/h1>/);
 assert.match(html,/<a class="button dark" href="\/">Til forsiden/);
 assert.match(html,/<script type="module" src="\/header-tools\.js\?/);
 assert.match(html,/<link rel="stylesheet" href="\/header-tools\.css\?/);
 assert.match(html,/<\/header><div class="mobile-menu-layer" hidden>/);
});
