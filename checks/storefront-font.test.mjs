import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {storefrontFontHref,storefrontFontSource,storefrontFontCss,assertStorefrontFont} from '../server/storefront-font.mjs';
import {publicHtmlNames,readHtmlTemplate} from '../server/html-templates.mjs';
import {contentPolicy} from '../server/request-guard.mjs';
import {createServer} from '../app-server.mjs';

test('blocking font stylesheet preserves exact approved bytes and visual descriptors without a decode-time fallback flash',async()=>{
 const [css,source,font]=await Promise.all([readFile(new URL('../public/storefront-font.css',import.meta.url),'utf8'),readFile(new URL('../public/style.css',import.meta.url),'utf8'),readFile(new URL('../public'+storefrontFontSource,import.meta.url))]);
 const embedded=css.match(/url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\)/);
 assert.ok(embedded,'font is carried by the blocking stylesheet, not a later request');
 assert.deepEqual(Buffer.from(embedded[1],'base64'),font);
 const face=source.match(/@font-face\s*\{[^}]*url\(\/fonts\/dm-sans-latin-v17\.woff2\)[^}]*\}/)?.[0];
 assert.match(css,/font-display: block;/,'embedded bytes must decode before fallback glyphs can flash');
 assert.equal(css.match(/@font-face\s*\{[\s\S]*?\}/)?.[0].replace(embedded[0],'url('+storefrontFontSource+')').replace('font-display: block;','font-display: swap;'),face,'family, style, range and weight remain unchanged');
 assert.match(css,/dm-sans-OFL\.txt/);
 assert.match(await readFile(new URL('../public/fonts/dm-sans-OFL.txt',import.meta.url),'utf8'),/SIL OPEN FONT LICENSE/);
 assert.equal(css,await storefrontFontCss());
 await assertStorefrontFont();
});

test('all storefront templates and static 404 load the font stylesheet after existing styles before the body',async()=>{
 for(const name of [...publicHtmlNames,'404.html']){
  const html=name==='404.html'?await readFile(new URL('../public/404.html',import.meta.url),'utf8'):await readHtmlTemplate(name);
  const link='<link rel="stylesheet" href="'+storefrontFontHref+'">';
  assert.equal(html.split(link).length-1,1,name+' has exactly one parser-blocking font stylesheet');
  assert.ok(html.indexOf(link)>html.indexOf('href="/style.css'),name+' overrides the existing Latin face');
  assert.ok(html.indexOf(link)<html.indexOf('</head>'),name+' receives the font before any body content');
  const meta=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
  if(name!=='404.html')assert.equal(meta,contentPolicy,name+' response and meta CSP agree');
 }
 // Embedded fonts need data:, but scripts, connections and document defaults do not.
 const directives=new Map(contentPolicy.split(';').map(value=>value.trim().split(/\s+/)).map(([name,...values])=>[name,values.join(' ')]));
 assert.equal(directives.get('font-src'),"'self' data:");
 for(const name of ['default-src','script-src','connect-src'])assert.equal(directives.get(name),"'self'");
});

test('HTTP serves the standalone font stylesheet with caching and the necessary font-only CSP allowance',async()=>{
 const server=createServer({store:{enabled:false}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const response=await fetch(base+storefrontFontHref);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/css/);assert.match(response.headers.get('cache-control'),/public, max-age=\d+/);
  assert.equal(await response.text(),await storefrontFontCss());
  const home=await fetch(base+'/');assert.match(home.headers.get('content-security-policy'),/font-src 'self' data:;/);assert.match(home.headers.get('content-security-policy'),/script-src 'self';/);assert.ok((await home.text()).includes(storefrontFontHref));
 }finally{await new Promise(resolve=>server.close(resolve));}
});
