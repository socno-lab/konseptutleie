import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readHtmlTemplate,publicHtmlNames} from '../server/html-templates.mjs';
test('all storefront pages advertise the branded favicon and touch icon',async()=>{
 for(const page of publicHtmlNames){const html=await readHtmlTemplate(page);assert.match(html,/<link rel="icon" type="image\/png" href="\/favicon.png\?v=brand20261105" sizes="96x96">/);assert.match(html,/href="\/favicon.svg\?v=brand20261105"/);assert.match(html,/rel="apple-touch-icon"/);}
});
test('PNG icons have declared square sizes and ICO contains browser fallback sizes',async()=>{
 for(const [name,size] of [['favicon.png',96],['apple-touch-icon.png',180],['favicon-512.png',512]]){const bytes=await readFile(new URL('../public/'+name,import.meta.url));assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
 const ico=await readFile(new URL('../public/favicon.ico',import.meta.url));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);assert.deepEqual([ico[6],ico[22],ico[38]],[16,32,48]);
});
test('SVG uses a self-contained logo shape rather than an external font',async()=>{
 const svg=await readFile(new URL('../public/favicon.svg',import.meta.url),'utf8');assert.match(svg,/viewBox="0 0 512 512"/);assert.match(svg,/<path fill="#323925"/);assert.doesNotMatch(svg,/<text|https?:[^"]+\.(woff|png)|#68C4FF/);
});
