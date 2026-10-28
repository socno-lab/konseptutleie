import test from 'node:test';import assert from 'node:assert/strict';import{pricingHintDismissed,rememberPricingHint,pricingHintPlacement}from'../public/pricing-scope-hint.js';
test('pricing explanation is shown until explicitly acknowledged and remembered across visits',()=>{const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert.equal(pricingHintDismissed(storage),false);rememberPricingHint(storage);assert.equal(pricingHintDismissed(storage),true);});
test('blocked persistent storage falls back to session and does not throw',()=>{const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},data=new Map(),session={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};assert.equal(pricingHintDismissed(broken,session),false);rememberPricingHint(broken,session);assert.equal(pricingHintDismissed(broken,session),true);rememberPricingHint(broken,broken);});

const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
test('desktop explanation stays beneath its control when there is room',()=>{
 const host=rect(64,250,1152,150),anchor=rect(88,285,560,48);
 const result=pricingHintPlacement({host,anchor,width:520,height:210,viewportWidth:1280,viewportHeight:900,headerBottom:106});
 assert.equal(result.left,host.left);
 assert.equal(result.top,host.bottom+12);
 assert.equal(result.side,'below');
 assert.ok(result.top+210<=888,'all actions remain inside the viewport');
 assert.equal(result.left+result.arrow+6,anchor.left+anchor.width/2,'the arrow points to the control');
});

test('desktop explanation flips above a low control without crossing the sticky header',()=>{
 const host=rect(64,550,1152,150),anchor=rect(88,585,560,48);
 const result=pricingHintPlacement({host,anchor,width:520,height:210,viewportWidth:1280,viewportHeight:760,headerBottom:106});
 assert.equal(result.side,'above');
 assert.equal(result.top+210,host.top-12);
 assert.ok(result.top>=118);
});

test('320px mobile layout keeps overlay and arrow within the screen',()=>{
 const host=rect(16,195,288,170),anchor=rect(32,240,256,60);
 const result=pricingHintPlacement({host,anchor,width:288,height:240,viewportWidth:320,viewportHeight:760,headerBottom:87});
 assert.ok(result.left>=12);
 assert.ok(result.left+288<=308);
 assert.ok(result.top>=99);
 assert.ok(result.top+240<=748);
 assert.equal(result.side,'below');
 assert.ok(result.arrow>=18&&result.arrow<=264);
});

test('a panned visual viewport clamps the overlay instead of overflowing either horizontal edge',()=>{
 for(const x of [10,700]){
  const host=rect(x,260,700,120),anchor=rect(x+20,280,250,48);
  const result=pricingHintPlacement({host,anchor,width:336,height:210,left:140,top:80,viewportWidth:360,viewportHeight:620,headerBottom:166});
  assert.ok(result.left>=152);
  assert.ok(result.left+336<=488);
  assert.ok(result.top>=178);
  assert.ok(result.top+210<=688);
  assert.ok(result.arrow>=18&&result.arrow<=312);
 }
});

test('when neither side fits, an overlay sized to the available height stays below the header',()=>{
 const host=rect(16,145,288,150),anchor=rect(32,185,256,48);
 const result=pricingHintPlacement({host,anchor,width:288,height:200,viewportWidth:320,viewportHeight:320,headerBottom:87});
 assert.ok(result.top>=99);
 assert.ok(result.top+200<=308);
 assert.equal(result.side,'overlap','an overlapping placement must not draw a misleading directional arrow');
});
