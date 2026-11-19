import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {defaultSettings} from '../public/site-settings.js?v=fest20261114';

const source=await readHtmlTemplate('utvalg.html');
const products=JSON.parse(await readFile(new URL('./fixtures/catalog.json',import.meta.url),'utf8'));
const heading=html=>html.match(/<section\b[^>]*\bid="utvalg"[^>]*>[\s\S]*?<div class="section-head">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
const render=(params,settings=defaultSettings,template=source)=>renderSeo(template,pageModel('/utvalg.html',new URLSearchParams(params),products,settings),products,true,settings);

test('initial heading follows the effective client category, including legacy and housing routes',()=>{
 for(const [bruk,kategori,title] of [
  ['alle','Modulsofaer','Sofaer til leie'],
  ['boligsalg','Pakker','Møbelleie ved boligsalg'],
  ['messe','Pakker','Loungepakker og ferdige møbelpakker'],
  ['alle','Stoler','Stoler til leie'],
  ['alle','unknown-category','Møbler til leie']
 ])assert.equal(heading(render({bruk,kategori})),'<span class="desktop-catalog-title">'+title+'</span><span class="mobile-catalog-title">'+title+'</span>');
});

test('an empty configured category retains its escaped visible label from first paint',()=>{
 const settings=structuredClone(defaultSettings);
 settings.categories.push({id:'custom',label:'Plater & "lys" $&',subcategories:[]});
 const title='Plater &amp; &quot;lys&quot; $&amp; til leie';
 assert.equal(heading(render({kategori:'custom'},settings)),'<span class="desktop-catalog-title">'+title+'</span><span class="mobile-catalog-title">'+title+'</span>');
});

test('initial search value preserves URL text without markup or duplicate attributes',()=>{
 const query='bord & "lys" <grønn> $&';
 for(const existing of ['', ' value="old"', " value='old'", ' value=old']){
  const html=render({sok:query},defaultSettings,source.replace('id="search"','id="search"'+existing));
  const input=html.match(/<input\b[^>]*\bid="search"[^>]*>/)?.[0];
  assert.ok(input);
  assert.equal((input.match(/\svalue=/g)||[]).length,1);
  assert.ok(input.includes('value="bord &amp; &quot;lys&quot; &lt;grønn&gt; $&amp;"'));
 }
 assert.match(render({}),/<input\b[^>]*\bid="search"[^>]*\svalue=""/);
});
