import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readHtmlTemplate,publicHtmlNames} from '../server/html-templates.mjs';
const root=fileURLToPath(new URL('../public/',import.meta.url)),origin='https://example.invalid',version='?v=launch20261024',shared=new Set(['/site-settings.js','/business-purchase-model.js']);
const updated=new Set(['/app.js','/shop.js','/submission-ui.js','/receipt-layout.js']);
const renamed=new Set(['/app.js','/shop.js','/rental-usage-model.js','/customer-info.js','/storefront-feedback.js']);
const versionFor=file=>shared.has(file)?'':['/app.js','/shop.js','/admin/admin.js','/catalog-pagination.js','/purpose-order-model.js'].includes(file)?'?v=catalogcontrols20261024a':renamed.has(file)?'?v=pricingchoices20261024':updated.has(file)?'?v=sofareceipt20261024':version;
const imports=source=>[...source.matchAll(/\b(?:from|import)\s*['"]((?:\.{1,2}\/|\/)[^'"\s]+\.js(?:\?[^'"]*)?)['"]/g)].map(m=>m[1]);
async function walk(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const name=path.join(directory,entry.name);if(entry.isDirectory())files.push(...await walk(name));else files.push(name);}return files;}
async function graph(entry){
 const seen=new Set(),byFile=new Map();
 async function visit(url){if(seen.has(url.href))return;seen.add(url.href);if(!byFile.has(url.pathname))byFile.set(url.pathname,new Set());byFile.get(url.pathname).add(url.search);const source=await readFile(path.join(root,url.pathname),'utf8');for(const spec of imports(source))await visit(new URL(spec,url));}
 await visit(new URL(entry,origin));return byFile;
}
test('all public import paths use one release URL while shared mutable settings stay unversioned',async()=>{
 for(const file of (await walk(root)).filter(file=>file.endsWith('.js'))){for(const spec of imports(await readFile(file,'utf8'))){const base=new URL('/'+path.relative(root,file).split(path.sep).join('/'),origin),url=new URL(spec,base);assert.equal(url.search,versionFor(url.pathname),file+' imports '+spec);}}
});
test('rental and purchase entry graphs never instantiate one browser module under multiple query variants',async()=>{
 for(const entry of ['/app.js'+versionFor('/app.js'),'/shop.js'+versionFor('/shop.js'),'/admin/admin.js'+versionFor('/admin/admin.js')]){const modules=await graph(entry);for(const [file,queries] of modules)assert.equal(queries.size,1,entry+' duplicates '+file+': '+[...queries]);assert.ok(modules.has('/site-settings.js'));}
});
test('server HTML and admin entrypoints use the same canonical browser module release',async()=>{
 const html=[...await Promise.all(publicHtmlNames.map(name=>readHtmlTemplate(name))),...await Promise.all((await walk(path.join(root,'admin'))).filter(file=>file.endsWith('.html')).map(file=>readFile(file,'utf8')))];
 for(const source of html){for(const match of source.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g)){const url=new URL(match[1],origin);assert.equal(url.search,versionFor(url.pathname),match[1]);}}
});
