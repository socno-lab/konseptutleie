import assert from 'node:assert/strict';
import {homeOccasionCards} from './public/home-occasions.js';
import {defaultSettings} from './public/site-settings.js';
import {assertPresentationLock} from './server/presentation-lock.mjs';
import {assertDesignLock} from './server/design-lock.mjs';
import {assertStorefrontFont} from './server/storefront-font.mjs';
import {readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const {products}=JSON.parse(await readFile(path.join(root,'data/catalog-export-2026-10-17.json'),'utf8'));
for(const p of products)for(const image of [p.image,...(p.gallery||[])].filter(Boolean))if(image.startsWith('/assets/'))await access(path.join(root,'public',image));
await access(path.join(root,'public/index.html'));
// All occasion cards are part of the initial homepage, including the second row.
// Guard the rendered output so a future index-based lazy-loading rule fails CI.
const occasionImages=[...homeOccasionCards(products,defaultSettings).matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
assert.equal(occasionImages.length,defaultSettings.home.occasions.filter(c=>c.visible!==false).length);
assert.ok(occasionImages.length>=6,'Homepage loading check must cover the second row.');
for(const image of occasionImages)assert.match(image,/loading="eager"/,'Every homepage occasion image must load eagerly.');
await assertStorefrontFont();
await assertDesignLock();
await assertPresentationLock();
console.log('Godkjent uttrykk kontrollert.');
console.log(`Katalog og bildelenker kontrollert: ${products.length} oppføringer. Node-serveren krever ingen kompilering.`);
