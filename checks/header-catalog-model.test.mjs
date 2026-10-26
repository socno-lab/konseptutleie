import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildHeaderCatalog,searchHeaderCatalog,searchHeaderCategories,cleanFavoriteIds} from '../public/header-catalog-model.js';
import {configureSiteSettings} from '../public/site-settings.js';

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

test('sofa searches rank whole sofa families ahead of sofabord and match singular and plural',()=>{
 const entries=buildHeaderCatalog([
  item('table',{name:'Sofabord Luana',category:'Bord',subcategory:'Sofabord'}),
  item('dining',{name:'Spisebord Merge',category:'Bord',subcategory:'Spisebord'}),
  item('sofa',{name:'Hübsch Moment 3-seter sofa',category:'Sofaer'}),
  item('kid-end',{name:'Kid Juno, endemodul',category:'Sofaer',moduleSeries:'Kid Juno, beige',moduleRole:'left'}),
  item('kid-mid',{name:'Kid Juno, midtmodul',category:'Sofaer',moduleSeries:'Kid Juno, beige',moduleRole:'middle'}),
  item('senza',{name:'Senza, grønn',category:'Sofaer',rentalEnabled:false,saleEnabled:true})
 ]);
 const sofas=['product:sofa','module:Kid%20Juno%2C%20beige','product:senza'];
 assert.deepEqual(searchHeaderCatalog(entries,'sofa').slice(0,3).map(e=>e.id),sofas);
 assert.deepEqual(searchHeaderCatalog(entries,'sofaer').map(e=>e.id),sofas);
 assert.deepEqual(searchHeaderCatalog(entries,'sofabord').map(e=>e.id),['product:table']);
 assert.deepEqual(searchHeaderCatalog(entries,'modulsofa').map(e=>e.id),['module:Kid%20Juno%2C%20beige']);
 assert.deepEqual(searchHeaderCategories(entries,'sofa'),[{category:'Sofaer',title:'Sofaer',rentHref:'/utvalg.html?bruk=alle&kategori=Sofaer#utvalg',buyHref:'/kjop.html?kategori=Sofaer'}]);
 assert.deepEqual(searchHeaderCategories(entries,'modulsofa'),searchHeaderCategories(entries,'sofaer'));
 assert.deepEqual(searchHeaderCategories(entries,'sofabord').map(c=>c.category),['Bord']);
 assert.equal(searchHeaderCatalog(entries,'sofa').filter(e=>e.kind==='module').length,1);
});

test('multiword searches combine category synonyms with brand and colour without unrelated results',()=>{
 const entries=buildHeaderCatalog([
  item('table',{name:'Hübsch sofabord beige',category:'Bord'}),
  item('sofa',{name:'Hübsch Moment',category:'Sofaer',material:'Beige tekstil'}),
  item('blue',{name:'Hübsch Moment',category:'Sofaer',material:'Blå tekstil'}),
  item('kid',{name:'Kid Juno',category:'Sofaer',material:'Beige tekstil'})
 ]);
 assert.deepEqual(searchHeaderCatalog(entries,'hubsch sofaer beige').map(e=>e.id),['product:sofa']);
 assert.equal(searchHeaderCatalog(entries,'sofa beige hubsch')[0].id,'product:sofa');
 assert.deepEqual(searchHeaderCatalog(entries,'hubsch blå sofa').map(e=>e.id),['product:blue']);
 assert.deepEqual(searchHeaderCatalog(entries,'sofa rød'),[]);
 assert.deepEqual(searchHeaderCategories(entries,'hubsch sofa beige'),[]);
});

test('lamp subtype searches do not match every product in Belysning',()=>{
 const entries=buildHeaderCatalog([
  item('table-lamp',{name:'Hübsch Mush bordlampe',category:'Belysning',subcategory:'Bordlamper'}),
  item('floor-lamp',{name:'Hübsch gulvlampe',category:'Belysning',subcategory:'Gulvlamper'}),
  item('pendant',{name:'Pendellampe',category:'Belysning',subcategory:'Taklamper'})
 ]);
 assert.deepEqual(searchHeaderCatalog(entries,'gulvlampe').map(e=>e.id),['product:floor-lamp']);
 assert.deepEqual(searchHeaderCatalog(entries,'bordlampe').map(e=>e.id),['product:table-lamp']);
 assert.deepEqual(searchHeaderCatalog(entries,'lamper').map(e=>e.id),entries.map(e=>e.id));
 assert.deepEqual(searchHeaderCategories(entries,'gulvlampe').map(c=>c.category),['Belysning']);
});

test('category links use only active searchable inventory and each available sales channel',()=>{
 const entries=buildHeaderCatalog([
  item('chair',{category:'Stoler'}),
  item('sale-table',{category:'Bord',rentalEnabled:false,saleEnabled:true}),
  item('hidden-sofa',{category:'Sofaer',active:false}),
  item('deleted-sofa',{category:'Sofaer',deletedAt:'2026-10-26'}),
  item('addon-sofa',{category:'Sofaer',addonOnly:true}),
  item('unavailable-sofa',{category:'Sofaer',rentalEnabled:false}),
  item('lamp-nickel',{category:'Belysning',variantGroup:'Mush',variantLabel:'Nikkel',rentalEnabled:false,saleEnabled:true}),
  item('lamp-green',{category:'Belysning',variantGroup:'Mush',variantLabel:'Grønn'}),
  item('package',{category:'Pakker',isPackage:true,name:'Loungepakken'})
 ]);
 assert.deepEqual(searchHeaderCategories(entries,'sofa'),[]);
 assert.deepEqual(searchHeaderCategories(entries,'stol'),[{category:'Stoler',title:'Stoler',rentHref:'/utvalg.html?bruk=alle&kategori=Stoler#utvalg',buyHref:''}]);
 assert.deepEqual(searchHeaderCategories(entries,'bord'),[{category:'Bord',title:'Bord',rentHref:'',buyHref:'/kjop.html?kategori=Bord'}]);
 const [lamps]=searchHeaderCategories(entries,'lamper');
 assert.equal(lamps.rentHref,'/utvalg.html?bruk=alle&kategori=Belysning#utvalg');
 assert.equal(lamps.buyHref,'/kjop.html?kategori=Belysning');
 const [packages]=searchHeaderCategories(entries,'ferdige pakker');
 assert.equal(packages.title,'Pakker og tjenester');assert.equal(packages.category,'Pakker');assert.equal(packages.buyHref,'');
 assert.deepEqual(searchHeaderCategories(entries,''),[]);assert.deepEqual(searchHeaderCategories(null,'sofa'),[]);assert.deepEqual(searchHeaderCategories(entries,{}),[]);
});

test('configured category labels remain searchable while links retain actual category keys',()=>{
 try{
  configureSiteSettings({categories:[{id:'Sofaer',label:'Sofa og lounge',subcategories:[]},{id:'Kunstige planter',label:'Grønne planter',subcategories:[]}]});
  const entries=buildHeaderCatalog([item('sofa',{category:'Sofaer',name:'Juno'}),item('plant',{category:'Kunstige planter',name:'Ficus'})]);
  assert.equal(searchHeaderCategories(entries,'sofa')[0].title,'Sofa og lounge');
  const [plants]=searchHeaderCategories(entries,'grønne planter');
  assert.equal(plants.title,'Grønne planter');assert.equal(plants.rentHref,'/utvalg.html?bruk=alle&kategori=Kunstige%20planter#utvalg');
  assert.equal(searchHeaderCatalog(entries,'grønne planter')[0].id,'product:plant');
 }finally{configureSiteSettings(null);}
});

test('favorite storage rejects malformed values, deduplicates and bounds retained IDs',()=>{
 assert.deepEqual(cleanFavoriteIds('product:a'),[]);assert.deepEqual(cleanFavoriteIds({id:'product:a'}),[]);
 assert.deepEqual(cleanFavoriteIds([null,{},1,'','unknown:a','product:','product:<script>','product:%00','product:a%2Fb','module:%zz','module:%3Cscript%3E','module:..','module: a','variant:one','product:a:extra','product:'+('a'.repeat(81)),'product:a','product:a','module:Gr%C3%B8nn']),['product:a','module:Gr%C3%B8nn']);
 const many=Array.from({length:150},(_,i)=>'product:id'+i);
 assert.equal(cleanFavoriteIds(many).length,100);assert.equal(cleanFavoriteIds(many).at(-1),'product:id99');
});
