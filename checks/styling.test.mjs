import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {stylingApi} from '../server/styling-api.mjs';
import {nextMovement} from '../server/styling-store.mjs';
import {createAdminCodeSender} from '../server/admin-email-code.mjs';
import {digest} from '../server/auth.mjs';

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

test('Stylist invitation sends a personal activation link and retains a fallback on mail failure',async()=>{
  const email='stylist@example.invalid',origin='https://example.invalid';
  const messages=[];
  let saved,accepted=true;
  const store={enabled:true,admin:async()=>({email:'admin@example.invalid'}),stylingInvite:async(...input)=>{saved=input;}};
  const sender=createAdminCodeSender({SMTP_PASS:'test'},store,async message=>{
    messages.push(message);
    assert.ok(saved);
    return {accepted:accepted?[email]:[]};
  });
  const invite=value=>stylingApi({
    req:{method:'POST',headers:{origin}},route:'invite',store,origin,
    json:async()=>({email:value}),authenticated:async()=>true,out:(_status,body)=>body,
    sendInvitation:sender.sendStylistInvitation
  });
  const sent=await invite(email);
  assert.equal(sent.sent,true);
  assert.deepEqual(saved,[email,digest(new URL(sent.url).hash.slice('#invite='.length)),false]);
  assert.equal(messages[0].to,email);
  assert.ok(messages[0].text.includes(sent.url));
  accepted=false;
  const fallback=await invite(email);
  assert.equal(fallback.sent,false);
  assert.notEqual(fallback.url,sent.url);
  await assert.rejects(invite('other@example.invalid,'+email),{status:400});
  assert.equal(messages.length,2);
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

test('Base sofas register distinct left/right labels and a legacy label can be split only once',async()=>{
  const {DatabaseSync}=await import('node:sqlite');
  const {stylingStore,stylingSchema}=await import('../server/styling-store.mjs');
  const sql=new DatabaseSync(':memory:');
  try{
    for(const stmt of stylingSchema.filter(s=>s.includes('CREATE TABLE IF NOT EXISTS ku_styling_'))){
      sql.exec(stmt.replace('BIGINT AUTO_INCREMENT PRIMARY KEY','INTEGER PRIMARY KEY').replace(/, INDEX\(\w+\)/g,''));
    }
    const db={beginTransaction:()=>sql.exec('BEGIN'),commit:()=>sql.exec('COMMIT'),rollback:()=>sql.exec('ROLLBACK'),release(){},
      execute(statement,values=[]){const q=sql.prepare(statement.replace(' FOR UPDATE',''));return [/^SELECT/.test(statement)?q.all(...values):q.run(...values)];}};
    const store=stylingStore(async()=>{},{getConnection:()=>db},db.execute);
    const p={id:'stockholm',name:'STOCKHOLM 2025',moduleRole:'base'};
    const {ids}=await store.stylingRegister(p,2,'stylist');
    assert.equal(new Set(ids).size,4);
    const job=await store.stylingJob('Testgata','stylist');
    await store.stylingMove({id:ids[0],action:'ready',revision:1},'stylist');
    await store.stylingMove({id:ids[0],action:'out',revision:2,job:job.id},'stylist');
    const {items}=await store.stylingOverview();
    assert.deepEqual(ids.map(id=>items.find(i=>i.id===id).side),['left','right','left','right']);
    assert.equal(items.find(i=>i.id===ids[1]).state,'held');
    assert.deepEqual(ids.map(id=>items.find(i=>i.id===id).labelPending),[0,1,1,1]);
    await store.stylingMove({id:ids[1],action:'ready',revision:1},'stylist');
    await store.stylingMove({id:ids[1],action:'hold',revision:2},'stylist');
    assert.equal((await store.stylingOverview()).items.find(i=>i.id===ids[1]).labelPending,0);
    const legacy=(await store.stylingRegister({...p,moduleRole:''},1,'stylist')).ids[0];
    await store.stylingMove({id:legacy,action:'ready',revision:1},'stylist');
    const split=await store.stylingSplit(legacy,2,[p],'stylist');
    assert.equal(split.ids[0],legacy);assert.equal(split.ids.length,2);
    await assert.rejects(store.stylingSplit(legacy,3,[p],'stylist'),{status:409});
    assert.equal((await store.stylingOverview()).items.length,6);
  }finally{sql.close();}
});
