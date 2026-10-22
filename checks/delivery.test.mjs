import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryPrice,requiresTwoPeople,rentalDeliveryCapacity,createDeliveryEstimator,warehouse} from '../server/delivery.mjs';
import {createServer} from '../app-server.mjs';
const products=[{id:'chair',name:'Stol',active:true},{id:'sofa',name:'Moment',category:'Sofaer',active:true},{id:'table',name:'Sofabord',active:true},{id:'module',name:'Utemodul',moduleSeries:'outdoor',moduleRole:'middle',active:true},{id:'package',isPackage:true,components:[{id:'sofa',quantity:1}],active:true},{id:'cycle',components:[{id:'cycle',quantity:1}],active:true}];
const input={basket:{chair:1},address:'Karl Johans gate 1, 0154 Oslo',visits:2};
const route=seconds=>({ok:true,json:async()=>({routes:[{legs:[{duration:seconds+'s'},{duration:'1900s'}]}]})});
test('Time zones include return driving and apply exact 30/40 minute boundaries',()=>{
 assert.equal(deliveryPrice(1800,1).total,690);assert.equal(deliveryPrice(1800,2).total,1380);
 assert.equal(deliveryPrice(1800,2,true).total,2380);assert.equal(deliveryPrice(1800.001,1).total,890);
 assert.equal(deliveryPrice(2400,2).total,1780);assert.equal(deliveryPrice(2400,2,true).total,2780);
 const outside=deliveryPrice(2400.001,2);assert.equal(outside.manual,true);assert.equal(outside.total,undefined);
 assert.throws(()=>deliveryPrice(-1,1));assert.throws(()=>deliveryPrice(100,4));assert.throws(()=>deliveryPrice(Infinity,2));
});
test('Sofas, outdoor modules and packages require two people, coffee tables do not',()=>{
 for(const id of ['sofa','module','package'])assert.equal(requiresTwoPeople({[id]:1},products),true);
 for(const id of ['chair','table','cycle'])assert.equal(requiresTwoPeople({[id]:1},products),false);
 assert.equal(requiresTwoPeople({sofa:0},products),false);
});
test('Server enforces sofa crew, rejects stale products and only sends addresses to Google',async()=>{
 let request,calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'private-test-key'},async(url,options)=>{calls++;request={url,options};return route(1500);});
 assert.equal((await estimator.estimate({...input,basket:{sofa:1},twoPeople:false},'a',products)).total,2380);
 assert.equal((await estimator.estimate({...input,basket:{chair:1}},'a',products)).total,1380);
 assert.equal((await estimator.estimate({...input,basket:{chair:1},twoPeople:true},'a',products)).total,1380);
 const payload=JSON.parse(request.options.body);assert.equal(payload.origin.address,warehouse);assert.equal(payload.destination.address,warehouse);assert.equal(payload.routingPreference,'TRAFFIC_UNAWARE');assert.equal(payload.basket,undefined);
 assert.equal(request.options.headers['X-Goog-FieldMask'],'routes.legs.duration');
 await assert.rejects(()=>estimator.estimate({...input,basket:{unknown:1}},'a',products),{status:400});assert.equal(calls,1);
 await assert.rejects(()=>estimator.estimate({...input,address:'Oslo'},'a',products),{status:400});
 assert.equal((await createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>route(2500)).estimate(input,'shared',products)).manual,true);
});
test('Missing key, uncertain routes and Google errors never produce free freight',async()=>{
 await assert.rejects(()=>createDeliveryEstimator({}).estimate(input,'shared',products),{status:503});
 for(const reply of [{ok:false},{ok:true,json:async()=>({routes:[]})},{ok:true,json:async()=>({routes:[{legs:[{duration:'bad'},{duration:'100s'}]}]})}])await assert.rejects(()=>createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'secret'},async()=>reply).estimate(input,'shared',products));
});
test('Public endpoint uses catalog, protects secrets, checks origin and throttles requests',async()=>{
 let calls=0;const server=createServer({store:{enabled:true,readCatalog:async()=>({products}),reserveDeliveryCall:async()=>true},env:{GOOGLE_MAPS_API_KEY:'do-not-publish'},origin:'https://shop.example',deliveryFetch:async()=>{calls++;return route(1200);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const config=await (await fetch(base+'/api/delivery-estimate')).json();assert.equal(config.enabled,true);assert.ok(!JSON.stringify(config).includes('do-not-publish'));
  const post=origin=>fetch(base+'/api/delivery-estimate',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...input,basket:{sofa:1},twoPeople:false,total:0})});
  assert.equal((await post('https://evil.example')).status,403);
  const result=await (await post('https://shop.example')).json();assert.equal(result.total,2380);
  for(let i=0;i<19;i++)assert.equal((await post('https://shop.example')).status,200);
  assert.equal((await post('https://shop.example')).status,200);assert.equal(calls,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Concurrent identical addresses share one paid request and only our price offers are cached',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>release=resolve);
 const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;await gate;return route(1200);});
 const results=Array.from({length:12},(_,i)=>estimator.estimate({...input,basket:i%2?{sofa:1}:{chair:1}},String(i),products));
 await Promise.resolve();assert.equal(calls,1);release();const quotes=await Promise.all(results);
 assert.equal(quotes[0].total,1380);assert.equal(quotes[1].total,2380);assert.deepEqual(quotes[0].prices,{onePerson:690,twoPeople:1190});
 const cached=await estimator.estimate({...input,address:'  KARL JOHANS GATE 1  0154 OSLO ',visits:1},'shared',products);
 assert.equal(calls,1);assert.equal(cached.total,690);assert.equal(cached.minutes,undefined);
 assert.ok(!JSON.stringify(cached).includes(input.address));
});
test('Global minute, hour and day budgets stop paid calls independently of client IDs',async()=>{
 let now=0,calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;return route(1200);},{now:()=>now});
 for(let hour=0;hour<5;hour++){
  for(let minute=0;minute<10;minute++){
   now=hour*3600000+minute*60000;
   for(let n=0;n<10;n++)await estimator.estimate({...input,address:`Gate ${calls+1}, 2010 Strømmen`},'client-'+calls,products);
   await assert.rejects(()=>estimator.estimate({...input,address:`Gate blocked-${calls}, 2010 Strømmen`},'new-client',products),{status:429});
  }
  now=hour*3600000+11*60000;
  await assert.rejects(()=>estimator.estimate({...input,address:`Gate hour-${hour}, 2010 Strømmen`},'hour-client',products),{status:429});
 }
 now=6*3600000;await assert.rejects(()=>estimator.estimate({...input,address:'Gate daily, 2010 Strømmen'},'fresh-client',products),{status:429});assert.equal(calls,500);
 now=86400000;await estimator.estimate({...input,address:'Gate next day, 2010 Strømmen'},'next-day-client',products);assert.equal(calls,501);
});
test('Persistent reservation survives estimator restarts and fails closed when unavailable',async()=>{
 let reserved=0,calls=0;const reserve=async()=>++reserved<=2;
 for(let i=0;i<3;i++){
  const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;return route(1200);},{reserve});
  if(i<2)await estimator.estimate(input,'shared',products);else await assert.rejects(()=>estimator.estimate(input,'shared',products),{status:429});
 }
 assert.equal(calls,2);
 await assert.rejects(()=>createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{throw Error('Must not call Google');},{reserve:async()=>{throw Error('Database unavailable');}}).estimate(input,'shared',products),{status:503});
});
test('Concurrency and client limits also apply, and failed address requests back off',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>release=resolve);
 const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;await gate;return route(1200);});
 const pending=Array.from({length:4},(_,i)=>estimator.estimate({...input,address:`Gate ${i}, 2010 Strømmen`},String(i),products));
 await assert.rejects(()=>estimator.estimate({...input,address:'Gate fifth, 2010 Strømmen'},'fifth',products),{status:429});release();await Promise.all(pending);assert.equal(calls,4);
 let now=0,badCalls=0;const bad=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{badCalls++;throw Error('network error');},{now:()=>now});
 await assert.rejects(()=>bad.estimate(input,'shared',products));await assert.rejects(()=>bad.estimate(input,'shared',products));assert.equal(badCalls,1);
 now=31000;await assert.rejects(()=>bad.estimate(input,'shared',products));assert.equal(badCalls,2);
 const perClient=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>route(1200),{now:()=>now});
 for(let i=0;i<20;i++){now+=60000;await perClient.estimate({...input,address:`Gate ${i}, 2010 Strømmen`},'one-client',products);}
 now+=60000;await assert.rejects(()=>perClient.estimate({...input,address:'Gate overflow, 2010 Strømmen'},'one-client',products),{status:429});
});

test('Rental capacity boundaries count physical modules and sofa quantities across the whole basket',()=>{
 const catalog=[...products,{id:'base',moduleSeries:'Senzo',moduleRole:'base'},{id:'decor',category:'Dekor'},{id:'rug',category:'Tepper'},{id:'lamp',category:'Belysning'},{id:'service',isService:true}];
 for(const basket of [{sofa:1,chair:6},{module:3,chair:6},{chair:10},{base:1,module:1,chair:6}])assert.equal(rentalDeliveryCapacity(basket,catalog).manual,false);
 for(const basket of [{sofa:2},{module:4},{sofa:1,module:1},{sofa:1,chair:7},{module:3,chair:7},{chair:11},{base:2}])assert.equal(rentalDeliveryCapacity(basket,catalog).manual,true);
 const load=rentalDeliveryCapacity({sofa:1,chair:6,decor:20,rug:20,lamp:20,service:20},catalog);assert.equal(load.manual,false);assert.equal(load.other,6);
 assert.equal(rentalDeliveryCapacity({base:1,module:1},catalog).modules,3);
});
test('Packages expand recursively and quantities add to loose products; missing or cyclic contents fail closed',()=>{
 const catalog=[...products,{id:'lounge',isPackage:true,components:[{id:'module',quantity:3},{id:'chair',quantity:2}]},{id:'mingle',isPackage:true,components:[{id:'chair',quantity:3}]},{id:'nested',isPackage:true,components:[{id:'mingle',quantity:2}]},{id:'broken',isPackage:true,components:[{id:'missing',quantity:1}]},{id:'cycle-package',isPackage:true,components:[{id:'cycle-package',quantity:1}]}];
 assert.equal(rentalDeliveryCapacity({lounge:1},catalog).manual,false);
 assert.equal(rentalDeliveryCapacity({lounge:1,mingle:1},catalog).manual,false);
 const combined=rentalDeliveryCapacity({lounge:1,mingle:5},catalog);assert.equal(combined.manual,true);assert.equal(combined.modules,3);assert.equal(combined.other,17);
 assert.equal(rentalDeliveryCapacity({mingle:3,chair:1},catalog).manual,false);
 assert.equal(rentalDeliveryCapacity({mingle:3,chair:2},catalog).manual,true);
 assert.equal(rentalDeliveryCapacity({nested:1},catalog).other,6);
 for(const id of ['broken','cycle-package'])assert.equal(rentalDeliveryCapacity({[id]:1},catalog).reason,'unknown');
});
test('Oversized rental orders never call Google, even if a standard price is already cached',async()=>{
 let calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;return route(1200);});
 assert.equal((await estimator.estimate({...input,basket:{chair:10}},'a',products)).manual,false);
 for(const basket of [{chair:11},{sofa:2},{module:4},{sofa:1,chair:7}]){
  const quote=await estimator.estimate({...input,basket},'a',products);assert.equal(quote.manual,true);assert.equal(quote.reason,'capacity');assert.equal(quote.total,undefined);assert.equal(quote.prices,null);
 }
 assert.equal(calls,1);
});

test('Custom rental enquiries always require agreed transport and never call Google',async()=>{
 assert.equal(rentalDeliveryCapacity({chair:1},products,true).reason,'custom');
 let calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;return route(1200);});
 const quote=await estimator.estimate({...input,basket:{chair:1},customRequest:true},'a',products);
 assert.equal(quote.manual,true);assert.equal(quote.reason,'custom');assert.equal(quote.total,undefined);assert.equal(calls,0);
 assert.equal((await estimator.estimate({...input,basket:{chair:1}},'a',products)).manual,false);assert.equal(calls,1);
});

test('Pictures and wall arrangements do not use the ordinary freight item allowance, including package contents',()=>{const catalog=[...products,{id:'picture',category:'Bilder',isService:false},{id:'wall',category:'Bilder',isService:true},{id:'picturepack',isPackage:true,components:[{id:'picture',quantity:8}]}];const load=rentalDeliveryCapacity({chair:10,picture:20,wall:20,picturepack:5},catalog);assert.equal(load.manual,false);assert.equal(load.other,10);assert.equal(rentalDeliveryCapacity({chair:11,picture:1},catalog).manual,true);});
