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
 await assert.rejects(()=>estimator.estimate({...input,basket:{unknown:1}},'a',products),{status:400});assert.equal(calls,3);
 await assert.rejects(()=>estimator.estimate({...input,address:'Oslo'},'a',products),{status:400});
 assert.equal((await createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'key'},async()=>route(2500)).estimate(input)).manual,true);
});
test('Missing key, uncertain routes and Google errors never produce free freight',async()=>{
 await assert.rejects(()=>createDeliveryEstimator({}).estimate({}),{status:503});
 for(const reply of [{ok:false},{ok:true,json:async()=>({routes:[]})},{ok:true,json:async()=>({routes:[{legs:[{duration:'bad'},{duration:'100s'}]}]})}])await assert.rejects(()=>createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'secret'},async()=>reply).estimate(input));
});
test('Public endpoint uses catalog, protects secrets, checks origin and throttles requests',async()=>{
 const server=createServer({store:{enabled:true,readCatalog:async()=>({products})},env:{GOOGLE_MAPS_API_KEY:'do-not-publish'},origin:'https://shop.example',deliveryFetch:async()=>route(1200)});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const config=await (await fetch(base+'/api/delivery-estimate')).json();assert.equal(config.enabled,true);assert.ok(!JSON.stringify(config).includes('do-not-publish'));
  const post=origin=>fetch(base+'/api/delivery-estimate',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({...input,basket:{sofa:1},twoPeople:false,total:0})});
  assert.equal((await post('https://evil.example')).status,403);
  const result=await (await post('https://shop.example')).json();assert.equal(result.total,2380);
  for(let i=0;i<19;i++)assert.equal((await post('https://shop.example')).status,200);
  assert.equal((await post('https://shop.example')).status,429);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
