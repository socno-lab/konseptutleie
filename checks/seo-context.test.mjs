import test from 'node:test';
import assert from 'node:assert/strict';
import {pageModel,renderSeo,structuredData,sitemap,productCards} from '../server/seo.mjs';
import {defaultSettings,getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=produktvalg2';
import {newContentPage} from '../public/page-model.js?v=fest20261114';
import {occasionLandingView} from '../public/occasion-landing-view.js?v=seo20261117';
import {messeSeoContent} from '../public/messe-seo-content.js?v=seo20261117';
const products=[
 {id:'lounge',name:'Loungepakken',category:'Pakker',isPackage:true,active:true,rentalEnabled:true,purposesExplicit:true,purposes:['messe','bedrift'],description:'En samlet lounge til event og messe.',material:'Sofa, stoler og bord',price:700,weekPrice:2100,monthPrice:4200,rentalRates:{standard:{price:700,weekPrice:2100,monthPrice:4200,stylingContinuation:true},messe:{price:1100,weekPrice:3300,monthPrice:6600,stylingContinuation:false}}},
 {id:'vip',name:'VIP-område',category:'Pakker',isPackage:true,active:true,rentalEnabled:true,purposesExplicit:true,purposes:['messe'],description:'Møbler til VIP-lounge.',price:1000,weekPrice:3000,monthPrice:6000,rentalRates:{standard:{price:1000,weekPrice:3000,monthPrice:6000},messe:{price:1500,weekPrice:4500,monthPrice:9000}}},
 {id:'housing',name:'Kun bolig',category:'Pakker',isPackage:true,active:true,rentalEnabled:true,purposesExplicit:true,purposes:['boligsalg'],price:50,weekPrice:100,monthPrice:200},
 {id:'chair',name:'Messe-stol',category:'Stoler',active:true,purposesExplicit:true,purposes:['messe']},
 {id:'hidden',name:'Minglepakken',category:'Pakker',isPackage:true,active:false,purposes:['messe']}
];
const source='<html><head><title>Old</title></head><body><main><section id="occasionLanding"></section><h2>Et utvalg å bygge på.</h2><section id="catalogUsage" aria-labelledby="catalogUsageHeading"></section><div id="products" class="products"></div></main></body></html>';
function site(){const settings=structuredClone(defaultSettings),page=newContentPage('messe');Object.assign(page,{area:'messe',heading:'Vår oppdaterte messeside',intro:'Redigert i admin.',text:'Eiers egen tekst.',sections:[{heading:'Ferdige pakker',text:'Pakkene finnes nå.',label:'Se pakker',type:'catalog',category:'Pakker'}]});settings.contentPages=[page,newContentPage('produksjon')];return settings;}
const graph=(model,settings)=>JSON.parse(structuredData(model,settings))['@graph'];
test('server metadata, hero and sitemap use explicitly supplied admin settings rather than stale module state',()=>{
 const settings=site(),snapshot=JSON.stringify({products,settings}),previous=getSiteSettings();
 const model=pageModel('/anledning.html',new URLSearchParams('bruk=messe&anledning=messe'),products,settings);
 assert.equal(model.h1,'Vår oppdaterte messeside');assert.match(model.description,/fastpris på enkeltmøbler og pakker/);
 const html=renderSeo(source,model,products,true,settings);
 assert.match(html,/<h1>Vår oppdaterte messeside<\/h1>/);assert.match(html,/Eiers egen tekst/);assert.match(html,/Oslo, Lillestrøm og på hele Østlandet/);
 assert.ok(html.replace(/<svg\b[\s\S]*?<\/svg>/g,'↗').includes(occasionLandingView(model.canonical,settings,products).html));
 const custom=newContentPage('kundemote');custom.area='bedrift';settings.contentPages.push(custom);
 assert.match(sitemap(products,true,settings),/bruk=bedrift&amp;anledning=kundemote/);settings.contentPages.pop();
 assert.equal(JSON.stringify({products,settings}),snapshot);assert.deepEqual(getSiteSettings().pricing,previous.pricing);
});
test('no-JavaScript messe cards and product details carry the selected gross tariff, period and usage',()=>{
 const model=pageModel('/leieprodukt.html',new URLSearchParams('produkt=lounge&bruk=messe&prisbruk=messe'),products,site());
 const html=renderSeo(source,model,products,true,site()),fallback=html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];
 assert.match(fallback,/1\s*100 kr \/ døgn/);assert.match(fallback,/uke · 7 døgn/);assert.match(fallback,/måned · 30 døgn/);
 assert.doesNotMatch(fallback,/Boligfoto og visning|700 kr \/ døgn/);assert.match(fallback,/#productPageHost\{display:none/);
 const catalogue=pageModel('/utvalg.html',new URLSearchParams('kategori=Pakker&bruk=messe&prisbruk=messe'),products,site());
 assert.deepEqual(catalogue.items.map(p=>p.id),['lounge','vip']);
 const cards=productCards(catalogue.items,false,catalogue.catalogUsage);assert.doesNotMatch(cards,/href="[^"]*(?:bruk|retur)=/);assert.doesNotMatch(cards,/Kun bolig|Boligfoto og visning/);
 const canonical=pageModel('/leieprodukt.html',new URLSearchParams('produkt=vip'),products,site());
 assert.match(renderSeo(source,canonical,products,true,site()).match(/<noscript>([\s\S]*?)<\/noscript>/)[1],/1\s*500 kr/);
});
test('schema distinguishes the legal address and appointment-only warehouse, and does not fabricate rental offers',()=>{
 const settings=site(),model=pageModel('/anledning.html',new URLSearchParams('anledning=messe'),products,settings),data=graph(model,settings);
 assert.equal(data.find(x=>x['@type']==='Organization').address.streetAddress,'Gimleveien 22');
 const local=data.find(x=>x['@type']==='LocalBusiness');assert.equal(local.address.streetAddress,'Segelckes vei 15');assert.equal(local.openingHours,undefined);
 assert.ok(data.some(x=>x['@type']==='CollectionPage'));assert.ok(data.some(x=>x['@type']==='ItemList'));assert.ok(data.some(x=>x['@type']==='Service'));
 assert.deepEqual(data.find(x=>x['@type']==='ItemList').itemListElement.map(x=>x.name),['Loungepakken','VIP-område']);
 const rental=graph(pageModel('/leieprodukt.html',new URLSearchParams('produkt=lounge'),products,settings),settings).at(-1);
 assert.ok(rental.description.startsWith(products[0].description));assert.match(rental.description,/fastpriser.*Leiesummen beregnes på nett/);assert.equal(rental.offers,undefined);assert.equal(rental.aggregateRating,undefined);
});
test('messe content links only actual eligible packages and leaves all catalogue and admin values intact',()=>{
 const page=site().contentPages[0],snapshot=JSON.stringify({page,products}),enriched=messeSeoContent(page,products);
 assert.deepEqual(enriched.sections[0].productLinks.map(x=>x.label),['Loungepakken','VIP-område']);
 assert.match(enriched.sectionsIntro,/konferanse/);assert.ok(enriched.faq.some(q=>q.question.includes('NOVA Spektrum')));
 assert.doesNotMatch(enriched.sectionsIntro,/partner|garantert|oktober/);assert.equal(JSON.stringify({page,products}),snapshot);
 assert.equal(messeSeoContent({...page,id:'other'},products).id,'other');
});

test('no-JavaScript sale amounts retain cents rather than rounding the published price',()=>{
 const sale={id:'sale',name:'Bord',active:true,saleEnabled:true,salePrice:999.9};
 assert.match(productCards([sale],true),/999,90 kr inkl\. mva\./);
});

test('descriptive sofa search metadata leaves product identity, visible content and rates unchanged',()=>{
 const settings=site(),module={...products[0],id:'module',name:'Lys beige – hjørne-/endemodul',category:'Sofaer',isPackage:false,moduleSeries:'Modulsofa, lys beige',moduleRole:'end'};
 const catalogue=[module],snapshot=JSON.stringify(catalogue);
 const model=pageModel('/leieprodukt.html',new URLSearchParams('produkt=module&bruk=messe&prisbruk=messe'),catalogue,settings);
 assert.equal(model.title,'Lei modulsofa i lys beige – hjørne-/endemodul | Konseptuell');
 assert.equal(model.h1,module.name);assert.equal(model.product,module);assert.equal(model.canonical,'/leieprodukt.html?produkt=module');
 const oldCopy={...model,title:'Lei '+module.name+' | Konseptuell',description:'Lei '+module.name+'. '+module.material+'. Velg leieperiode og send en forespørsel om tilgjengelighet.'};
 const body=m=>renderSeo(source,m,catalogue,true,settings).split('</head>')[1];
 assert.equal(body(model),body(oldCopy));assert.equal(JSON.stringify(catalogue),snapshot);
 const namedModule={...module,name:'Kid Isa – venstre endemodul, natur'};
 assert.match(pageModel('/leieprodukt.html',new URLSearchParams('produkt=module'),[namedModule],settings).title,/Lei sofamodul – Kid Isa/);
 const namedSofa={...module,name:'Senzo grunnsofa'};
 assert.equal(pageModel('/leieprodukt.html',new URLSearchParams('produkt=module'),[namedSofa],settings).title,'Lei Senzo grunnsofa | Konseptuell');
});

test('category search copy describes the rental use without changing filters, housing or purchase context',()=>{
 const settings=site(),catalogue=[{...products[3],id:'bed',category:'Senger'},{...products[3],id:'stylist',category:'Styling'},{...products[3],id:'custom',category:'custom_id'}];
 settings.categories.push({id:'custom_id',label:'Speil',subcategories:[]});
 const model=pageModel('/utvalg.html',new URLSearchParams('kategori=Senger'),catalogue,settings);
 assert.match(model.description,/gjester, midlertidig overnatting og boligfoto/);assert.equal(model.h1,'Senger til leie');assert.deepEqual(model.items.map(p=>p.id),['bed']);
 const body=m=>renderSeo(source,m,catalogue,true,settings).split('</head>')[1];
 assert.equal(body(model),body({...model,description:'Lei senger til event, messe og midlertidige rom.'}));
 assert.match(pageModel('/utvalg.html',new URLSearchParams('kategori=Styling'),catalogue,settings).description,/hjelp med styling og sesongdekor/);
 assert.match(pageModel('/utvalg.html',new URLSearchParams('kategori=custom_id'),catalogue,settings).description,/Lei speil til boligfoto/);
 assert.match(pageModel('/utvalg.html',new URLSearchParams('kategori=Senger&bruk=boligsalg'),catalogue,settings).description,/Lei enkeltmøbler til boligfoto/);
 assert.match(pageModel('/utvalg.html',new URLSearchParams('kategori=Dekor'),catalogue,settings).description,/Enkeltdekor leies ikke ut separat/);
 assert.match(pageModel('/kjop.html',new URLSearchParams(),catalogue,settings).description,/Se nye møbler og interiør fra salgssortimentet/);
});
