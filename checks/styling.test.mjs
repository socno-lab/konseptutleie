import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stylingApi} from '../server/styling-api.mjs';
import {nextMovement} from '../server/styling-store.mjs';

test('One physical unit can be out on only one job and returns through inspection',()=>{
  let item={state:'ready',job:null};
  item=nextMovement(item,'out','job1');
  assert.throws(()=>nextMovement(item,'out','job2'));
  assert.throws(()=>nextMovement(item,'in','job2'));
  item=nextMovement(item,'in','job1');
  assert.deepEqual(item,{state:'check',job:null});
  assert.throws(()=>nextMovement(item,'out','job2'));
  item=nextMovement(item,'hold');assert.equal(item.state,'held');
  assert.equal(nextMovement(item,'ready').state,'ready');
});
test('Labels round-trip through the same generator and camera decoder used by the page',async()=>{
  const context=vm.createContext({});
  for(const name of ['qrcode','jsQR'])vm.runInContext(await readFile(new URL('../public/styling/vendor/'+name+'.js',import.meta.url),'utf8'),context);
  const url='https://konseptuell.no/styling/index.html?item=K-0123456789ABCDEF';
  const qr=context.qrcode(0,'M');qr.addData(url);qr.make();
  const n=qr.getModuleCount(),size=(n+8)*4,pixels=new Uint8ClampedArray(size*size*4).fill(255);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x)){
    for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const pos=4*(((y+4)*4+dy)*size+(x+4)*4+dx);pixels.fill(0,pos,pos+3);}
  }
  assert.equal(context.jsQR(pixels,size,size).data,url);
});
test('Stylist API separates public numbers, personnel administration and movements',async()=>{
  const catalog=[{id:'chair',name:'Stol',stock:8,image:'/assets/chair.jpg',category:'Stoler',subcategory:'Spisestoler'},{id:'package',isPackage:true}];
  const store={enabled:true,stylingOverview:async()=>({jobs:[],items:[]}),readCatalog:async()=>({products:catalog}),stylingSession:async()=> 'stylist@example.invalid'};
  const req={method:'GET',headers:{cookie:'ku_stylist='+'a'.repeat(43)}};
  const base={req,store,authenticated:async()=>false,origin:'https://example.invalid',out:(status,body)=>body};
  const view=await stylingApi({...base,route:'overview'});assert.deepEqual(view.products,[catalog[0]]);assert.deepEqual(view.staff,[]);
  req.method='POST';req.headers.origin=base.origin;
  await assert.rejects(stylingApi({...base,route:'invite',json:async()=>({email:'user@example.invalid'})}),{status:403});
  req.headers.origin='https://other.invalid';await assert.rejects(stylingApi({...base,route:'jobs'}),{status:403});
  req.method='GET';req.headers.cookie='';await assert.rejects(stylingApi({...base,route:'overview'}),{status:401});
});

test('Warehouse filters combine category, subordinate category, state and available QR units',async()=>{
  const {stockRows,filtered,defaults,jobResults,jobDefaults}=await import('../public/styling/workspace.js');
  const rows=stockRows({products:[{id:'p',name:'Stol',category:'Møbler',subcategory:'Stoler',stock:18},{id:'q',name:'Bord',category:'Møbler',subcategory:'Bord',stock:12}],items:[{product:'p',state:'out',id:'K-001'},{product:'p',state:'ready',id:'K-002'}]});
  const filters={...defaults,category:'Møbler',sub:'Stoler',state:'out',avail:'yes',term:'stol'};
  assert.deepEqual(filtered(rows,filters).map(p=>[p.id,p.available,p.items.length]),[['p',1,2]]);
  assert.equal(filtered(rows,{...filters,sub:'Bord'}).length,0);
  const jobs=[{address:'Gate 1',stylist:'Ella',created:Date.UTC(2026,10,24,23,30)}];
  assert.match(jobResults(jobs,{...jobDefaults,term:'gate',stylist:'Ella',from:'2026-11-25',to:'2026-11-25'},()=>''),/Gate 1/);
  assert.doesNotMatch(jobResults(jobs,{...jobDefaults,to:'2026-11-24'},()=>''),/Gate 1/);
});
