import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryPrice,requiresTwoPeople,createDeliveryEstimator,warehouse} from '../server/delivery.mjs';
import {createServer} from '../app-server.mjs';
const products=[{id:'chair',name:'Stol',active:true},{id:'sofa',name:'Moment',category:'Sofaer',active:true},{id:'table',name:'Sofabord',active:true},{id:'module',name:'Utemodul',moduleSeries:'outdoor',moduleRole:'middle',active:true},{id:'package',components:[{id:'sofa',quantity:1}],active:true},{id:'cycle',components:[{id:'cycle',quantity:1}],active:true}];
const input={address:'Karl Johans gate 1, 0154 Oslo',visits:2};
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
 assert.equal((await createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>route(2500)).estimate(input)).manual,true);
});
test('Missing key, uncertain routes and Google errors never produce free freight',async()=>{
 await assert.rejects(()=>createDeliveryEstimator({}).estimate({}),{status:503});
 for(const reply of [{ok:false},{ok:true,json:async()=>({routes:[]})},{ok:true,json:async()=>({routes:[{legs:[{duration:'bad'},{duration:'100s'}]}]})}])await assert.rejects(()=>createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'secret'},async()=>reply).estimate(input));
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
 const cached=await estimator.estimate({...input,address:'  KARL JOHANS GATE 1  0154 OSLO ',visits:1});
 assert.equal(calls,1);assert.equal(cached.total,690);assert.equal(cached.minutes,undefined);
 assert.ok(!JSON.stringify(cached).includes(input.address));
});
test('Global minute, hour and day budgets stop paid calls independently of client IDs',async()=>{
 let now=0,calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;return route(1200);},{now:()=>now});
 for(let hour=0;hour<5;hour++){
  for(let minute=0;minute<10;minute++){
   now=hour*3600000+minute*60000;
   for(let n=0;n<10;n++)await estimator.estimate({...input,address:`Gate ${calls+1}, 2010 Strømmen`},'client-'+calls);
   await assert.rejects(()=>estimator.estimate({...input,address:`Gate blocked-${calls}, 2010 Strømmen`},'new-client'),{status:429});
  }
  now=hour*3600000+11*60000;
  await assert.rejects(()=>estimator.estimate({...input,address:`Gate hour-${hour}, 2010 Strømmen`},'hour-client'),{status:429});
 }
 now=6*3600000;await assert.rejects(()=>estimator.estimate({...input,address:'Gate daily, 2010 Strømmen'},'fresh-client'),{status:429});assert.equal(calls,500);
 now=86400000;await estimator.estimate({...input,address:'Gate next day, 2010 Strømmen'},'next-day-client');assert.equal(calls,501);
});
test('Persistent reservation survives estimator restarts and fails closed when unavailable',async()=>{
 let reserved=0,calls=0;const reserve=async()=>++reserved<=2;
 for(let i=0;i<3;i++){
  const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;return route(1200);},{reserve});
  if(i<2)await estimator.estimate(input);else await assert.rejects(()=>estimator.estimate(input),{status:429});
 }
 assert.equal(calls,2);
 await assert.rejects(()=>createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{throw Error('Must not call Google');},{reserve:async()=>{throw Error('Database unavailable');}}).estimate(input),{status:503});
});
test('Concurrency and client limits also apply, and failed address requests back off',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>release=resolve);
 const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{calls++;await gate;return route(1200);});
 const pending=Array.from({length:4},(_,i)=>estimator.estimate({...input,address:`Gate ${i}, 2010 Strømmen`},String(i)));
 await assert.rejects(()=>estimator.estimate({...input,address:'Gate fifth, 2010 Strømmen'},'fifth'),{status:429});release();await Promise.all(pending);assert.equal(calls,4);
 let now=0,badCalls=0;const bad=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>{badCalls++;throw Error('network error');},{now:()=>now});
 await assert.rejects(()=>bad.estimate(input));await assert.rejects(()=>bad.estimate(input));assert.equal(badCalls,1);
 now=31000;await assert.rejects(()=>bad.estimate(input));assert.equal(badCalls,2);
 const perClient=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>route(1200),{now:()=>now});
 for(let i=0;i<20;i++){now+=60000;await perClient.estimate({...input,address:`Gate ${i}, 2010 Strømmen`},'one-client');}
 now+=60000;await assert.rejects(()=>perClient.estimate({...input,address:'Gate overflow, 2010 Strømmen'},'one-client'),{status:429});
});
