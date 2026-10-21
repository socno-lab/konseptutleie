import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryPrice,createDeliveryEstimator,warehouse} from '../server/delivery.mjs';
import {createServer} from '../app-server.mjs';
test('Delivery and collection charge actual round trips, each with a single base fee',()=>{
 assert.deepEqual(deliveryPrice(40000,2),{visits:2,drivenKm:80,base:1580,distancePrice:1600,total:3180,vatIncluded:true,estimated:true});
 assert.equal(deliveryPrice(40000,1).total,1590);
 assert.equal(deliveryPrice(0,1).total,790);
 assert.equal(deliveryPrice(39123,2).total,3145);
 assert.throws(()=>deliveryPrice(-1,1));assert.throws(()=>deliveryPrice(40000,4));assert.throws(()=>deliveryPrice(Infinity,2));
});
test('Routes key stays server-side and both legs are included without cached route data',async()=>{
 let request;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'private-test-key'},async(url,options)=>{request={url,options};return {ok:true,json:async()=>({routes:[{distanceMeters:41000,legs:[{distanceMeters:20000},{distanceMeters:21000}]}]})};});
 const result=await estimator.estimate({address:'Karl Johans gate 1, 0154 Oslo',visits:2});
 assert.equal(result.total,3220);assert.equal(result.drivenKm,82);assert.ok(!JSON.stringify(result).includes('private-test-key'));
 const payload=JSON.parse(request.options.body);assert.equal(payload.origin.address,warehouse);assert.equal(payload.destination.address,warehouse);assert.equal(payload.intermediates.length,1);assert.equal(payload.routingPreference,'TRAFFIC_UNAWARE');
 assert.equal(request.options.headers['X-Goog-Api-Key'],'private-test-key');
 await assert.rejects(()=>estimator.estimate({address:'Oslo',visits:2}),{status:400});
});
test('Missing key, uncertain routes and Google errors never produce a zero freight price',async()=>{
 await assert.rejects(()=>createDeliveryEstimator({}).estimate({}),{status:503});
 for(const reply of [{ok:false},{ok:true,json:async()=>({routes:[]})},{ok:true,json:async()=>({routes:[{distanceMeters:40,legs:[{distanceMeters:1},{distanceMeters:2}]}]})}]){
  const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'secret'},async()=>reply);
  await assert.rejects(()=>estimator.estimate({address:'Karl Johans gate 1, 0154 Oslo',visits:2}));
 }
});
test('Public endpoint exposes configuration without secrets, requires same origin and enforces throttling',async()=>{
 const server=createServer({env:{GOOGLE_MAPS_API_KEY:'do-not-publish'},origin:'https://shop.example',deliveryFetch:async()=>({ok:true,json:async()=>({routes:[{distanceMeters:2000,legs:[{distanceMeters:1000},{distanceMeters:1000}]}]})})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const config=await (await fetch(base+'/api/delivery-estimate')).json();assert.equal(config.enabled,true);assert.ok(!JSON.stringify(config).includes('do-not-publish'));
  const post=origin=>fetch(base+'/api/delivery-estimate',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({address:'Storgata 1, 2010 Strømmen',visits:2,total:0})});
  assert.equal((await post('https://evil.example')).status,403);
  const result=await (await post('https://shop.example')).json();assert.equal(result.total,1660);
  for(let i=0;i<19;i++)assert.equal((await post('https://shop.example')).status,200);
  assert.equal((await post('https://shop.example')).status,429);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
