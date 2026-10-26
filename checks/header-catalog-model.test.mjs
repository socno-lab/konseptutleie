import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildHeaderCatalog,searchHeaderCatalog,cleanFavoriteIds} from '../public/header-catalog-model.js';

const item=(id,extra={})=>({id,name:id,category:'Stoler',active:true,rentalEnabled:true,saleEnabled:false,image:'/assets/test.webp',stock:1,...extra});

test('global catalogue excludes hidden, deleted, addon-only and unavailable-channel products',()=>{
 const products=[item('rent',{purposes:['boligsalg']}),item('buy',{rentalEnabled:false,saleEnabled:true}),item('hidden',{active:false}),item('deleted',{deletedAt:'2026-10-26'}),item('addon',{addonOnly:true}),item('neither',{rentalEnabled:false}),item('parent',{relatedAddOns:['legacy-addon']}),item('legacy-addon',{isService:true})];
 const entries=buildHeaderCatalog(products);
 assert.deepEqual(entries.map(e=>e.id),['product:rent','product:buy','product:parent']);
 const sale=entries.find(e=>e.id==='product:buy');
 assert.equal(sale.rentHref,'');assert.equal(sale.rentable,false);assert.equal(sale.purchasable,true);
 assert.equal(sale.buyHref,'/kjopsprodukt.html?produkt=buy');
 assert.equal(entries.find(e=>e.id==='product:rent').rentHref,'/leieprodukt.html?produkt=rent&bruk=alle');
 assert.deepEqual(buildHeaderCatalog(null),[]);
});

test('sofa modules share a stable favorite, complete cover and a builder-compatible representative',()=>{
 const middle=item('middle',{category:'Sofaer',moduleSeries:'Modulsofa, lys beige',moduleRole:'middle',gallery:['/assets/whole-sofa.webp']}),left=item('left',{category:'Sofaer',moduleSeries:'Modulsofa, lys beige',moduleRole:'left'}),right=item('right',{category:'Sofaer',moduleSeries:'Modulsofa, lys beige',moduleRole:'right'});
 const [entry]=buildHeaderCatalog([middle,right,left]);
 assert.equal(entry.kind,'module');assert.equal(entry.title,'Modulsofa, lys beige');
 assert.equal(entry.image,'/assets/whole-sofa.webp');assert.equal(entry.rentHref,'/leieprodukt.html?produkt=left&bruk=alle');
 assert.deepEqual(entry.productIds,['left','middle','right']);
 assert.equal(buildHeaderCatalog([right,middle,left])[0].id,entry.id);
 assert.deepEqual(cleanFavoriteIds([entry.id]),[entry.id]);
});

test('a required base module is preferred and sale links require sale-enabled modules',()=>{
 const products=[item('left',{moduleSeries:'Senzo',moduleRole:'left'}),item('base',{moduleSeries:'Senzo',moduleRequired:true}),item('middle',{moduleSeries:'Senzo',moduleRole:'middle',saleEnabled:true})];
 const [entry]=buildHeaderCatalog(products);
 assert.match(entry.rentHref,/produkt=base/);assert.match(entry.buyHref,/produkt=middle/);
});

test('lamp colours are one searchable family with independent rental and purchase links',()=>{
 const base={category:'Belysning',variantGroup:'Hübsch Mush Tall'};
 const [entry]=buildHeaderCatalog([item('nickel',{...base,name:'Hübsch Mush Tall, nikkel',variantLabel:'Nikkel',variantOrder:0,rentalEnabled:false,saleEnabled:true}),item('green',{...base,name:'Hübsch Mush Tall, grønn',variantLabel:'Grønn',variantOrder:1})]);
 assert.equal(entry.title,'Hübsch Mush Tall');assert.equal(entry.kind,'variant');
 assert.match(entry.rentHref,/produkt=green/);assert.match(entry.buyHref,/produkt=nickel/);
 assert.equal(searchHeaderCatalog([entry],'hubsch grønn')[0],entry);
 assert.equal(searchHeaderCatalog([entry],'Mush nikkel')[0],entry);
 assert.deepEqual(cleanFavoriteIds([entry.id]),[entry.id]);
});

test('explicit separate variants and furniture colours keep the established card grouping',()=>{
 const lamps=['black','white'].map(id=>item(id,{category:'Belysning',variantGroup:'Lamp',variantLabel:id,variantDisplay:'separate'}));
 const chairs=['green','red'].map(id=>item(id,{variantGroup:'Chair',variantLabel:id}));
 assert.equal(buildHeaderCatalog([...lamps,...chairs]).length,4);
 assert.equal(buildHeaderCatalog(chairs.map(p=>({...p,variantDisplay:'grouped'}))).length,1);
});

test('wall layouts, service options and ready packages retain meaningful searchable entries',()=>{
 const products=[item('wall-one',{category:'Bilder',isService:true,wallGroup:'Bildevegg',wallOrder:2,name:'Bildevegg – ett bilde'}),item('wall-many',{category:'Bilder',isService:true,wallGroup:'Bildevegg',wallOrder:1,wallCover:'/assets/wall.webp',name:'Bildevegg – galleri'}),item('tree180',{offeringType:'service',serviceGroup:'Klart til jul',serviceVariant:'180 cm',serviceOrder:1}),item('tree240',{offeringType:'service',serviceGroup:'Klart til jul',serviceVariant:'240 cm',serviceOrder:2}),item('package',{isPackage:true,name:'Loungepakken',includes:['Sofabord i eik','To stoler']})];
 const entries=buildHeaderCatalog(products);
 assert.equal(entries.length,3);
 const wall=entries.find(e=>e.kind==='wall');assert.equal(wall.title,'Bildevegg satt sammen av stylist');assert.equal(wall.image,'/assets/wall.webp');assert.match(wall.rentHref,/produkt=wall-many/);
 assert.equal(searchHeaderCatalog(entries,'jul 240')[0].title,'Klart til jul');
 assert.equal(searchHeaderCatalog(entries,'eik')[0].title,'Loungepakken');
 assert.ok(entries.every(e=>cleanFavoriteIds([e.id]).length===1));
});

test('search handles Norwegian letters, multiple terms, relevance and caller limits',()=>{
 const entries=buildHeaderCatalog([item('a',{name:'Stol',material:'Grønn eik'}),item('b',{name:'Grønn stol',material:'Bøk'}),item('c',{name:'Hübsch Ørn',material:'Ull, grå',category:'Sofaer'}),item('d',{name:'Ærlig blå'})]);
 assert.equal(searchHeaderCatalog(entries,'gronn')[0].title,'Grønn stol');
 assert.equal(searchHeaderCatalog(entries,'hubsch gra sofaer')[0].title,'Hübsch Ørn');
 assert.equal(searchHeaderCatalog(entries,'aerlig')[0].title,'Ærlig blå');
 assert.equal(searchHeaderCatalog(entries,'grønn eik')[0].title,'Stol');
 assert.equal(searchHeaderCatalog(entries,'stol',1).length,1);
 assert.equal(searchHeaderCatalog(entries,'stol',0).length,0);
 assert.deepEqual(searchHeaderCatalog(entries,''),[]);assert.deepEqual(searchHeaderCatalog(entries,{}),[]);
});

test('favorite storage rejects malformed values, deduplicates and bounds retained IDs',()=>{
 assert.deepEqual(cleanFavoriteIds('product:a'),[]);assert.deepEqual(cleanFavoriteIds({id:'product:a'}),[]);
 assert.deepEqual(cleanFavoriteIds([null,{},1,'','unknown:a','product:','product:<script>','product:%00','product:a%2Fb','module:%zz','module:%3Cscript%3E','module:..','module: a','variant:one','product:a:extra','product:'+('a'.repeat(81)),'product:a','product:a','module:Gr%C3%B8nn']),['product:a','module:Gr%C3%B8nn']);
 const many=Array.from({length:150},(_,i)=>'product:id'+i);
 assert.equal(cleanFavoriteIds(many).length,100);assert.equal(cleanFavoriteIds(many).at(-1),'product:id99');
});
