import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {homeOccasionCards} from '../public/home-occasions.js';
import {responsiveImageAttributes} from '../public/media-image.js';
import {renderSeo,pageModel} from '../server/seo.mjs';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js';
import {kiDisclosure} from '../public/image-provenance.js';
const image='/media/'+'a'.repeat(32),products=[{id:'active',name:'Active product',category:'Stoler',active:true,image},{id:'hidden',active:false,image:'/assets/hidden.jpg'},{id:'sale',active:true,rentalEnabled:false,image:'/assets/sale-only.jpg'}];
const source='<!doctype html><html><head><title>Konseptuell</title></head><body><main><section id="cards"><div id="homeUseCases" class="use-case-grid" aria-label="Finn utvalg etter bruksområde"></div></section><section id="after">After cards</section></main></body></html>';
function site(){const settings=structuredClone(defaultSettings);settings.home.occasions=settings.home.occasions.map(c=>({...c,productId:'active',image:''}));settings.imageLabels=[{url:image,generated:true}];return settings;}

test('server renders all admin-controlled occasion cards before scripts and uses the same client renderer',()=>{
 const settings=site(),cards=homeOccasionCards(products,settings),html=renderSeo(source,pageModel('/',new URLSearchParams(),products),products,true,settings);
 assert.ok(html.includes(cards));assert.equal((cards.match(/<figure>/g)||[]).length,6);assert.match(cards,/srcset="[^\"]*thumb=320 320w[^\"]*thumb=640 640w[^\"]*thumb=1280 1280w/);
 assert.match(cards,/href="\/utvalg.html\?bruk=boligsalg&amp;kategori=Enkeltprodukter#utvalg"/);assert.match(cards,/href="\/utvalg.html\?bruk=alle#utvalg"/);
 assert.equal(homeOccasionCards(products.filter(p=>p.rentalEnabled!==false),settings),cards);
 assert.ok(html.indexOf(cards)<html.indexOf('<section id="after">'));
});

test('literal replacement tokens and HTML characters in admin card titles remain literal SSR text',()=>{
 const settings=site();settings.home.occasions[0].title='Utvalg $& $1 $$ $` $\' & " <tag>';
 const cards=homeOccasionCards(products,settings),html=renderSeo(source,pageModel('/',new URLSearchParams(),products),products,true,settings);
 assert.ok(html.includes(cards),'SSR must insert the escaped renderer output literally, including dollar replacement tokens');
 assert.match(cards,/&lt;tag&gt;/);assert.doesNotMatch(cards,/<tag>/);assert.match(cards,/&amp; &quot;/);
});

test('explicit request settings control SSR cards and image labels even when global settings differ',()=>{
 const settings=site(),other=site();settings.home.occasions[0].title='Request-local title';other.home.occasions[0].title='Unrelated global title';other.imageLabels=[{url:image,generated:false}];configureSiteSettings(other);
 const html=renderSeo(source,pageModel('/',new URLSearchParams(),products),products,true,settings);assert.match(html,/Request-local title/);assert.doesNotMatch(html,/Unrelated global title/);assert.ok(html.includes(kiDisclosure));
 configureSiteSettings(defaultSettings);
});

test('hidden and sale-only image sources fall back while explicit admin cover images are retained',()=>{
 const settings=site();settings.home.occasions[0].productId='hidden';settings.home.occasions[1].productId='sale';settings.home.occasions[2].image='/assets/admin-cover.jpg';const cards=homeOccasionCards(products,settings);
 assert.doesNotMatch(cards,/hidden\.jpg|sale-only\.jpg/);assert.equal((cards.match(/src="\/assets\/hero.jpg"/g)||[]).length,2);assert.match(cards,/src="\/assets\/admin-cover.jpg"/);
});

test('responsive attributes only select immutable media variants and leave original source URLs intact',()=>{
 const attrs=responsiveImageAttributes(image,'(max-width:640px) 50vw, 33vw');assert.match(attrs,/thumb=320 320w/);assert.match(attrs,/thumb=640 640w/);assert.match(attrs,/thumb=1280 1280w/);assert.match(attrs,/sizes="\(max-width:640px\) 50vw, 33vw"/);
 for(const src of ['/assets/original.png','https://example.invalid/cover.png',image+'?thumb=640','javascript:bad'])assert.equal(responsiveImageAttributes(src),'');
});

test('local font files have valid WOFF2 headers, recorded lengths, licences and local font-face sources',async()=>{
 const root=new URL('../public/fonts/',import.meta.url),manifest=JSON.parse(await readFile(new URL('SOURCES.json',root),'utf8')),css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/@import\s+(?:url\()?['"]?https:\/\/fonts\./);assert.equal(manifest.files.length,8);
 for(const file of manifest.files){
  const bytes=await readFile(new URL(file.name,root));assert.equal(bytes.toString('ascii',0,4),'wOF2',file.name);assert.equal(bytes.readUInt32BE(8),bytes.length,file.name);assert.equal(bytes.length,file.bytes,file.name);assert.ok(bytes.readUInt16BE(12)>0,file.name);assert.equal(bytes.readUInt16BE(14),0,file.name);assert.ok(bytes.readUInt32BE(20)+48<=bytes.length,file.name);assert.ok(css.includes('url(/fonts/'+file.name+')'),file.name);
 }
 for(const family of ['dm-sans','manrope'])assert.match(await readFile(new URL(family+'-OFL.txt',root),'utf8'),/SIL OPEN FONT LICENSE/i);
 const faces=[...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].map(m=>m[1]);assert.equal(faces.length,8);for(const face of faces){assert.match(face,/font-weight:\s*400 700/);assert.match(face,/font-display:\s*swap/);assert.match(face,/font-style:\s*normal/);assert.match(face,/unicode-range:/);}
});
