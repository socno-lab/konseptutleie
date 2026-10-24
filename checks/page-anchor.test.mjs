import test from 'node:test';
import assert from 'node:assert/strict';
import {pageAnchorTarget,mountPageAnchor} from '../public/page-anchor.js';

class Events{
 constructor(){this.listeners=new Map();}
 addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(handler);}
 removeEventListener(type,handler){this.listeners.get(type)?.delete(handler);}
 dispatch(type,detail={}){for(const handler of [...(this.listeners.get(type)||[])])handler({type,...detail});}
}

// Keep scheduling and layout changes deterministic without introducing a DOM
// dependency. Browser QA covers the real header offset and rendered sections.
function fixture(hash='#skreddersydd',{resizeObserver=true}={}){
 const window=new Events(),document=new Events(),frames=new Map(),timers=new Map(),observers=[],calls=[],targets=new Map();let nextId=0;
 const addTarget=id=>{const element={id,scrollIntoView:options=>calls.push({id,options}),getBoundingClientRect:()=>({top:100,bottom:300})};targets.set(id,element);return element;};
 addTarget('skreddersydd');addTarget('slik');addTarget('utvalg');
 document.body={};document.documentElement={};document.getElementById=id=>targets.get(id)||null;document.querySelector=selector=>selector==='main'?document.body:null;document.defaultView=window;
 window.document=document;window.location={hash};window.scrollY=0;
 window.requestAnimationFrame=callback=>{const id=++nextId;frames.set(id,callback);return id;};window.cancelAnimationFrame=id=>frames.delete(id);
 window.setTimeout=(callback,delay)=>{const id=++nextId;timers.set(id,{callback,delay});return id;};window.clearTimeout=id=>timers.delete(id);
 if(resizeObserver)window.ResizeObserver=class{constructor(callback){this.callback=callback;this.disconnected=false;this.observed=[];observers.push(this);}observe(element){this.observed.push(element);}disconnect(){this.disconnected=true;}notify(){if(!this.disconnected)this.callback([]);}};
 const flushFrames=()=>{let safety=20;while(frames.size&&safety--){const pending=[...frames];frames.clear();for(const [,callback]of pending)callback();}assert.ok(safety>0,'alignment must not schedule an endless animation loop');};
 const expire=()=>{const pending=[...timers.values()];timers.clear();for(const {callback}of pending)callback();};
 const hashchange=next=>{window.location.hash=next;window.dispatch('hashchange');};
 return {window,document,targets,calls,frames,timers,observers,addTarget,flushFrames,expire,hashchange,resize(){for(const observer of observers)observer.notify();},input(type){document.dispatch(type);window.dispatch(type);}};
}

test('content anchors resolve decoded IDs safely while catalog anchors retain their own position rules',()=>{
 const view=fixture();
 assert.equal(pageAnchorTarget(view.document,'#skreddersydd'),view.targets.get('skreddersydd'));
 assert.equal(pageAnchorTarget(view.document,'#%73lik'),view.targets.get('slik'));
 for(const hash of ['', '#', '#utvalg', '#missing', '#%E0%A4%A'])assert.equal(pageAnchorTarget(view.document,hash),null,hash||'empty hash');
 const awkward=view.addTarget('a:b [c]');assert.equal(pageAnchorTarget(view.document,'#a%3Ab%20%5Bc%5D'),awkward,'IDs are resolved without treating a fragment as a selector');
});

test('explicit content navigation is aligned only after asynchronous rendering is ready',()=>{
 const view=fixture(),controller=mountPageAnchor(view);
 assert.equal(controller.hasTarget(),true);assert.equal(view.calls.length,0);
 assert.equal(controller.restore(),true,'a valid content target takes priority over saved pixel restoration');assert.equal(view.calls.length,0);
 view.flushFrames();assert.deepEqual(view.calls,[{id:'skreddersydd',options:{block:'start',behavior:'instant'}}]);
 controller.destroy();
});

test('empty missing and catalog hashes leave normal reload and product-return restoration available',()=>{
 for(const hash of ['', '#missing', '#utvalg', '#%E0%A4%A']){
  const view=fixture(hash),controller=mountPageAnchor(view);
  assert.equal(controller.hasTarget(),false);assert.equal(controller.restore(),false);view.flushFrames();view.resize();view.flushFrames();assert.equal(view.calls.length,0);
  controller.destroy();
 }
});

test('late content growth realigns the requested section within a bounded observation window',()=>{
 const view=fixture(),controller=mountPageAnchor(view);controller.restore();view.flushFrames();
 assert.ok(view.observers.some(observer=>observer.observed.length),'layout is observed while content settles');
 view.resize();view.flushFrames();assert.ok(view.calls.length>=2);assert.ok(view.calls.every(call=>call.id==='skreddersydd'));
 assert.ok([...view.timers.values()].some(({delay})=>delay>0&&delay<=2000),'layout correction has a short finite lifetime');
 view.expire();const before=view.calls.length;view.resize();view.flushFrames();assert.equal(view.calls.length,before,'settled navigation cannot keep pulling the reader back');
 controller.destroy();
});

test('a deliberate user action cancels pending alignment and subsequent layout corrections',()=>{
 for(const type of ['wheel','touchstart','pointerdown','keydown']){
  const view=fixture(),controller=mountPageAnchor(view);controller.restore();view.input(type);view.flushFrames();assert.equal(view.calls.length,0,type+' cancels a queued jump');
  const settled=fixture(),active=mountPageAnchor(settled);active.restore();settled.flushFrames();settled.input(type);const before=settled.calls.length;settled.resize();settled.flushFrames();assert.equal(settled.calls.length,before,type+' prevents later corrections');
  controller.destroy();active.destroy();
 }
});

test('input during a slow catalog request prevents a later jump until a new anchor is chosen',()=>{
 for(const type of ['wheel','touchstart','pointerdown','keydown']){
  const view=fixture(),controller=mountPageAnchor(view);view.input(type);
  assert.equal(controller.restore(),true,'the interrupted content anchor still prevents reload or saved-position fallback');
  view.flushFrames();view.resize();view.flushFrames();assert.equal(view.calls.length,0,type+' before readiness preserves the visitor’s chosen position');
  assert.equal(controller.restore(),true);view.flushFrames();assert.equal(view.calls.length,0,'a repeat render cannot revive interrupted navigation');
  view.hashchange('#slik');view.flushFrames();assert.deepEqual(view.calls.map(call=>call.id),['slik'],'an explicit new anchor starts fresh navigation');
  controller.destroy();
 }
});

test('hash navigation replaces stale pending work and restores later sections after readiness',()=>{
 const view=fixture(),controller=mountPageAnchor(view);controller.restore();view.hashchange('#slik');view.flushFrames();
 assert.deepEqual(view.calls.map(call=>call.id),['slik'],'the previous fragment must never win a later queued frame');
 view.hashchange('#skreddersydd');view.flushFrames();assert.equal(view.calls.at(-1).id,'skreddersydd');
 const before=view.calls.length;view.hashchange('#utvalg');view.resize();view.flushFrames();assert.equal(controller.hasTarget(),false);assert.equal(controller.restore(),false);assert.equal(view.calls.length,before,'catalog navigation is not redirected to the previous content section');
 controller.destroy();
});

test('repeated restoration coalesces work and destroying the controller removes pending behavior',()=>{
 const view=fixture(),controller=mountPageAnchor(view);controller.restore();controller.restore();view.flushFrames();assert.equal(view.calls.length,1);
 controller.restore();controller.destroy();const before=view.calls.length;view.hashchange('#slik');view.resize();view.expire();view.flushFrames();assert.equal(view.calls.length,before);controller.destroy();
});

test('anchor navigation still works when layout observation is unavailable',()=>{
 const view=fixture('#slik',{resizeObserver:false}),controller=mountPageAnchor(view);assert.equal(controller.restore(),true);view.flushFrames();assert.equal(view.calls.length,1);assert.equal(view.calls[0].id,'slik');controller.destroy();
});
