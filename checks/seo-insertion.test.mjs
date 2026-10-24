import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSeo,pageModel,escapeHtml,productCards,productContent} from '../server/seo.mjs';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js';
const tokens='Admin $& $1 $$ $` $\' & " <tag>',product={id:'one',name:tokens,category:'Bord',active:true,type:'coffee',material:tokens,description:tokens,image:'/assets/product.jpg',price:100,weekPrice:200,monthPrice:300,saleEnabled:true,salePrice:1200};
const source='<!doctype html><html><head><title>Original title</title></head><body><header>Original header</header><main><section id="occasionLanding">Original occasion</section><h2>Et utvalg å bygge på.</h2><h1>Møbler og belysning.</h1><div id="products" class="products"></div><div class="sale-grid" id="saleProducts"></div></main><footer>Original footer</footer></body></html>';

test('computed SEO titles, descriptions, JSON-LD and product markup treat replacement tokens as literal text',()=>{
 const settings=structuredClone(defaultSettings),categoryLabel=tokens.replace('<tag>','tag');settings.categories.find(c=>c.id==='Bord').label=categoryLabel;configureSiteSettings(settings);
 try{
  for(const [pathname,query] of [['/leieprodukt.html','produkt=one'],['/kjopsprodukt.html','produkt=one'],['/utvalg.html','kategori=Bord'],['/kjop.html','kategori=Bord'],['/midlertidig-moblering.html','']]){
   const model=pageModel(pathname,new URLSearchParams(query),[product]),html=renderSeo(source,model,[product],true,settings);
   assert.ok(html.includes('<title>'+escapeHtml(model.title)+'</title>'),pathname+' title must be inserted literally');
   assert.ok(html.includes('<meta name="description" content="'+escapeHtml(model.description)+'">'),pathname+' description must be inserted literally');
   const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.ok(graph['@graph'].length>=2);
   assert.equal((html.match(/<head>/g)||[]).length,1,pathname+' must not duplicate the head');assert.equal((html.match(/<main>/g)||[]).length,1,pathname+' must not duplicate the main content');
   assert.ok(html.includes(model.product?productContent(model,[product]):productCards(model.items,model.buy)),pathname+' must retain escaped product markup');
   if(model.product)assert.ok(graph['@graph'].some(item=>item.name===tokens||item.name==='Leie av '+tokens));
   else assert.ok(html.includes(escapeHtml(categoryLabel)+' til leie'),pathname+' discovery labels must remain literal');
  }
 }finally{configureSiteSettings(defaultSettings);}
});

test('occasion headings and descriptions are inserted literally without replacement-string expansion',()=>{
 const model={...pageModel('/anledning.html',new URLSearchParams('anledning=messe'),[product]),h1:tokens,description:tokens},html=renderSeo(source,model,[product],true,defaultSettings);
 assert.ok(html.includes('<section id="occasionLanding"><h1>'+escapeHtml(tokens)+'</h1><p>'+escapeHtml(tokens)+'</p>'));assert.equal((html.match(/<head>/g)||[]).length,1);assert.equal((html.match(/<main>/g)||[]).length,1);
});
