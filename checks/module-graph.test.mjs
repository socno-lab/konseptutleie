import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readHtmlTemplate,publicHtmlNames} from '../server/html-templates.mjs';
const root=fileURLToPath(new URL('../public/',import.meta.url)),origin='https://example.invalid',version='?v=launch20261024',shared=new Set(['/site-settings.js','/business-purchase-model.js']);
const updated=new Set(['/app.js','/shop.js','/submission-ui.js','/receipt-layout.js']);
const renamed=new Set(['/app.js','/shop.js','/rental-usage-model.js','/customer-info.js','/storefront-feedback.js']);
const versionFor=file=>['/app.js','/shop.js'].includes(file)?'?v=stockholm20261025':['/app.js','/shop.js','/module-photo-preview.js','/module-joined-profiles.js','/sofa-cart-row.js'].includes(file)?'?v=lagoon20261025':["/app.js","/shop.js","/enquiry-flow.js"].includes(file)?'?v=occasion20261025':["/app.js","/rental-usage-model.js"].includes(file)?'?v=pricingbasis20261025':["/app.js","/shop.js","/enquiry-flow.js","/discount-ui.js","/customer-info.js","/enquiry-submit-summary.js","/storefront-feedback.js"].includes(file)?'?v=submitprice20261025c':["/app.js","/shop.js","/enquiry-flow.js","/discount-ui.js","/package-cart-model.js","/addon-purchase-model.js","/buyout-model.js","/terms-versions.js","/customer-info.js"].includes(file)?'?v=auditfixes20261025':file==='/app.js'?'?v=separateaddons20261025':['/app.js','/shop.js','/enquiry-flow.js'].includes(file)?'?v=directcart20261025':['/app.js','/shop.js','/enquiry-flow.js','/enquiry-price-model.js','/storefront-feedback.js','/dialog-scroll-lock.js','/customer-info.js','/icons.js'].includes(file)?'?v=enquirypage20261025b':['/app.js','/shop.js','/submission-ui.js','/receipt-layout.js'].includes(file)?'?v=receipts20261025b':shared.has(file)?'':file==='/app.js'?'?v=detailprices20261025c':file==='/detail-price-model.js'?'?v=detailprices20261025':['/app.js','/buyout-model.js','/admin/admin.js'].includes(file)?'?v=buyout20261025b':['/app.js','/shop.js','/product-pages.js','/page-anchor.js'].includes(file)?'?v=anchor20261024':file==='/mobile-navigation.js'?'?v=mobilemenu20261024c':['/app.js','/catalog-order-model.js'].includes(file)?'?v=cataloglast20261024':['/shop.js','/catalog-pagination.js'].includes(file)?'?v=catalogmore20261024a':file==='/submission-ui.js'?'?v=serviceinfo20261024':['/admin/admin.js','/purpose-order-model.js'].includes(file)?'?v=catalogcontrols20261024a':renamed.has(file)?'?v=pricingchoices20261024':updated.has(file)?'?v=sofareceipt20261024':version;
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
