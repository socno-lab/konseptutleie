import test from 'node:test';import assert from 'node:assert/strict';
test('reply navigation appears only after scrolling, hides near form and does not focus a mobile select',async()=>{
 const originals=new Map(),events=new Map(),elements=new Map();let rect={top:1500,bottom:2200},focused=0,scrolled=0,requests=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{hidden:false,value:id==='replyDecision'?'accept':'',dataset:{},addEventListener(type,fn){events.set(id+':'+type,fn);},querySelectorAll(){return [];},querySelector(){return el('submit');},replaceChildren(){},getBoundingClientRect(){return rect;},scrollIntoView(){scrolled++;},focus(){focused++;},attachShadow(){this.shadowRoot={replaceChildren(){}};return this.shadowRoot;}});return elements.get(id);};
 const set=(key,value)=>{originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 try{set('document',{getElementById:el,querySelectorAll:()=>[]});set('location',{search:'?token=test'});set('window',{});set('scrollY',0);set('innerHeight',800);set('addEventListener',(type,fn)=>events.set(type,fn));set('requestAnimationFrame',fn=>fn());set('matchMedia',()=>({matches:true}));set('DOMParser',class{parseFromString(){return {body:{}};}});set('fetch',async()=>{requests++;return {ok:true,json:async()=>({accepted:false,html:'<p>Offer</p>',slots:[]})};});
 await import('../public/offer-acceptance.js?navigation-test');assert.equal(el('replyJump').hidden,true);
 globalThis.scrollY=120;events.get('scroll')();assert.equal(el('replyJump').hidden,false);
 rect={top:600,bottom:1300};events.get('scroll')();assert.equal(el('replyJump').hidden,true);
 rect={top:1500,bottom:2200};events.get('scroll')();events.get('replyJump:click')({preventDefault(){},detail:1});assert.equal(scrolled,1);assert.equal(focused,0);
 events.get('replyJump:click')({preventDefault(){},detail:0});assert.equal(focused,1);assert.equal(requests,1);
 globalThis.scrollY=0;events.get('scroll')();assert.equal(el('replyJump').hidden,true);
 }finally{for(const [key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
