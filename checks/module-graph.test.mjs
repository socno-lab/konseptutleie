import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readHtmlTemplate,publicHtmlNames} from '../server/html-templates.mjs';
const root=fileURLToPath(new URL('../public/',import.meta.url)),origin='https://example.invalid';
const imports=source=>[...source.matchAll(/\b(?:from|import)\s*['"]((?:\.{1,2}\/|\/)[^'"\s]+\.js(?:\?[^'"]*)?)['"]/g)].map(m=>m[1]);
const scripts=source=>[...source.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g)].map(m=>m[1]);
async function walk(directory){const files=[];for(const entry of await readdir(directory,{withFileTypes:true})){const name=path.join(directory,entry.name);if(entry.isDirectory())files.push(...await walk(name));else files.push(name);}return files;}
function add(map,url){if(!map.has(url.pathname))map.set(url.pathname,new Set());map.get(url.pathname).add(url.search);}
function assertUnique(map,label){for(const [file,queries] of map)assert.equal(queries.size,1,label+' duplicates '+file+': '+[...queries]);}
async function graph(entries){
 const seen=new Set(),byFile=new Map();
 async function visit(url){if(seen.has(url.href))return;seen.add(url.href);add(byFile,url);const source=await readFile(path.join(root,url.pathname),'utf8');for(const spec of imports(source))await visit(new URL(spec,url));}
 for(const entry of entries)await visit(new URL(entry,origin));return byFile;
}
// Verify actual module identities, not a hand-maintained history of release dates.
test('all public imports resolve to one URL for each module',async()=>{
 const refs=new Map();for(const file of (await walk(root)).filter(file=>file.endsWith('.js'))){const base=new URL('/'+path.relative(root,file).split(path.sep).join('/'),origin);for(const spec of imports(await readFile(file,'utf8')))add(refs,new URL(spec,base));}assertUnique(refs,'public imports');assert.ok(refs.has('/site-settings.js'));
});
test('rental, purchase and admin module graphs instantiate shared dependencies only once',async()=>{
 for(const entry of ['/app.js','/shop.js','/admin/admin.js','/admin/settings.js']){const modules=await graph([entry]);assertUnique(modules,entry);assert.ok(modules.has('/site-settings.js'));}
});
test('all scripts on each rendered public or admin page share the same module instances',async()=>{
 const pages=[...await Promise.all(publicHtmlNames.map(async name=>[name,await readHtmlTemplate(name)])),...await Promise.all((await walk(path.join(root,'admin'))).filter(file=>file.endsWith('.html')).map(async file=>[file,await readFile(file,'utf8')]))];
 for(const [name,source] of pages){const entries=scripts(source);assert.ok(entries.length,name+' has scripts');assertUnique(await graph(entries),name);}
});
