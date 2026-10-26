import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderArrowIcons,arrowUpRightIcon} from '../server/arrow-icons.mjs';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';

test('homepage action arrows are SVGs in the initial HTML, before any client script runs',async()=>{
 const source=await readHtmlTemplate('index.html');
 for(const html of [source,renderSeo(source,pageModel('/',new URLSearchParams(),[]),[],true)]){
  for(const name of ['home-catalog-link','hero-custom-link']){
   const action=html.match(new RegExp('<(?:a|button)\\b[^>]*class="[^"]*'+name+'[^"]*"[^>]*>[\\s\\S]*?<\\/(?:a|button)>'))?.[0];
   assert.ok(action,name+' exists');
   assert.ok(action.includes(arrowUpRightIcon),name+' has the approved line icon before hydration');
   assert.ok(!action.includes('↗'),name+' cannot flash the platform glyph');
  }
 }
});

test('server arrow rendering preserves attributes, code, values and existing icons',()=>{
 const untouched='<a title="Go ↗ >" data-label=\'↗\'>Text</a><!-- ↗ --><script>const label="↗"; if(a<b){}</script><style>.x:after{content:"↗"}</style><textarea>↗</textarea><option>↗</option><svg><text>↗</text></svg>';
 assert.equal(renderArrowIcons(untouched),untouched);
 const rendered=renderArrowIcons('<a>Se alle produkter <span aria-hidden="true">↗</span></a>');
 assert.equal(rendered,'<a>Se alle produkter <span aria-hidden="true">'+arrowUpRightIcon+'</span></a>');
 assert.equal(renderArrowIcons(rendered),rendered);
});

test('server and client arrows use the same line shape and stroke',async()=>{
 const client=await readFile(new URL('../public/icons.js',import.meta.url),'utf8');
 for(const [name,value] of Object.entries({d:'M5 19 19 5M5 5h14v14',fill:'none',stroke:'currentColor','stroke-width':'1.5','stroke-linecap':'round','stroke-linejoin':'round'})){
  assert.ok(arrowUpRightIcon.includes(name+'="'+value+'"'));
  assert.ok(client.includes("path.setAttribute('"+name+"','"+value+"')"));
 }
});
