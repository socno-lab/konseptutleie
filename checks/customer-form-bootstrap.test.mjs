import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readHtmlTemplate,publicHtmlNames} from '../server/html-templates.mjs';

// Browsers key ES modules by the whole URL, including query strings. A second
// customer-info URL mounts address, transport and required terms fields twice.
test('each storefront loads one customer form module URL through its complete import graph',async()=>{
 const origin='https://konseptuell.test';
 async function graph(html){
  const seen=new Set();
  async function visit(url){
   if(seen.has(url.href))return;seen.add(url.href);
   const source=await readFile(new URL('../public'+url.pathname,import.meta.url),'utf8');
   for(const match of source.matchAll(/\bimport\s+(?:[^;\n]*?\sfrom\s*)?['"]([^'"]+)['"]/g)){
    const child=new URL(match[1],url);if(child.origin===origin)await visit(child);
   }
  }
  for(const match of html.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)['"]/g))await visit(new URL(match[1],origin));
  return [...seen].filter(url=>new URL(url).pathname==='/customer-info.js');
 }
 for(const name of publicHtmlNames){
  const raw=await readFile(new URL('../public/'+name,import.meta.url),'utf8');
  for(const [label,html] of [['source',raw],['served',await readHtmlTemplate(name)]]){
   const modules=await graph(html);
   assert.equal(modules.length,1,`${name} (${label}) must mount forms once: ${modules.join(', ')}`);
  }
 }
});
