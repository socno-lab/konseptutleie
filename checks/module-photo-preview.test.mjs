import test from 'node:test';
import assert from 'node:assert/strict';
import {photoProfiles} from '../public/module-photo-profiles.js';
import {modulePhotoParts,modulePhotoPreview} from '../public/module-photo-preview.js';
const product=(id,moduleRole,moduleWidth=80)=>({id,name:id,moduleRole,moduleWidth,image:'/image.jpg'});
test('base photo is split around selected middle modules',()=>{
 const modules=[product('base','base',220),product('middle','middle',81)];
 const parts=modulePhotoParts(modules,{base:1,middle:2});
 assert.deepEqual(parts.map(p=>[p.product.id,p.role,p.half]),[['base','left','left'],['middle','middle',''],['middle','middle',''],['base','right','right']]);
 assert.equal(parts.reduce((n,p)=>n+p.width,0),382);
});
test('separate and reversible ends surround the middle, with no phantom end',()=>{
 const modules=[product('right','right'),product('middle','middle'),product('left','left')];
 assert.deepEqual(modulePhotoParts(modules,{left:1,middle:1,right:1}).map(p=>p.role),['left','middle','right']);
 const reversible=[product('end','end'),product('middle','middle')];
 assert.deepEqual(modulePhotoParts(reversible,{end:1,middle:1}).map(p=>p.role),['left','middle']);
 assert.deepEqual(modulePhotoParts(reversible,{end:2,middle:1}).map(p=>p.role),['left','middle','right']);
});
test('outdoor selections use the actual number of photographed modules',()=>{
 const modules=[product('outdoor','middle',70)];
 assert.equal(modulePhotoParts(modules,{outdoor:4}).length,4);
 assert.equal((modulePhotoPreview(modules,{outdoor:4}).match(/data-photo-module=/g)||[]).length,4);
 assert.match(modulePhotoPreview(modules,{}),/Velg moduler/);
});
test('photo markup escapes catalogue content and wraps large selections',()=>{
 const p=product('"><script>','middle');p.name='<unsafe>';p.image='x" onload="unsafe';
 const html=modulePhotoPreview([p],{[p.id]:20});
 assert.ok(!html.includes('<unsafe>'));assert.ok(!html.includes('<script>'));
 assert.match(html,/viewBox="-8 0 496 400"/);
});
test('one universal end fills the free side when paired with a sided end',()=>{
 const modules=[product('left','left'),product('right','right'),product('end','end'),product('middle','middle')];
 assert.deepEqual(modulePhotoParts(modules,{left:1,end:1,middle:1}).map(p=>[p.product.id,p.role]),[['left','left'],['middle','middle'],['end','right']]);
 assert.deepEqual(modulePhotoParts(modules,{right:1,end:1,middle:1}).map(p=>[p.product.id,p.role]),[['end','left'],['middle','middle'],['right','right']]);
});
test('beige two-end and three-module sofas use the exact assembled photos',()=>{
 const modules=[{...product('obj_371e3a52807c452ea1280dafd434b7e4','end',92),image:'/assets/beige-endemodul.webp'},{...product('obj_d9314111959a42bf8b7ca3015af09003','middle',70),image:'/assets/beige-midtmodul.webp'}];
 assert.match(modulePhotoPreview(modules,{[modules[0].id]:2}),/beige-sofa-to-moduler.webp/);
 assert.match(modulePhotoPreview(modules,{[modules[0].id]:2,[modules[1].id]:1}),/beige-sofa-tre-moduler.webp/);
 assert.match(modulePhotoPreview(modules,{[modules[0].id]:2,[modules[1].id]:2}),/KI-generert illustrasjon/);
});
test('Senzo ends and inserted middle share one coherent photographic perspective',()=>{
 const base={...product('obj_4e31c6c5bcca4f91abad27609806ac0f','base',220),moduleSeries:'Jakobsdals Senzo, sennep',image:'https://cdn.shopify.com/s/files/1/0262/5811/2563/files/8133615.webp?v=1787812247'};
 const mid={...product('obj_742f0d2dc6e24339ae594b05ac88c747','middle',81),moduleSeries:base.moduleSeries,image:'https://cdn.shopify.com/s/files/1/0262/5811/2563/files/8133715.webp?v=1787812348'};
 const html=modulePhotoPreview([base,mid],{[base.id]:1,[mid.id]:2});
 const images=[...html.matchAll(/<image href="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(images.length,4);assert.equal(new Set(images).size,1);
 assert.equal(images[0],photoProfiles[base.id].source);
 assert.match(images[0],/^\/media\//);
});

test('both Copacabana colours form a continuous sofa for two through seven modules',async()=>{
 const {readFile}=await import('node:fs/promises');const {products}=JSON.parse(await readFile(new URL('./fixtures/module-photo-catalog.json',import.meta.url),'utf8'));
 for(const id of ['obj_c274f2d322614de4be80c2b891a78174','obj_ad4086d4e89041529b6c6563f220b046']){
  const p=products.find(p=>p.id===id);
  for(const count of [2,3,4,7]){const markup=modulePhotoPreview([p],{[id]:count});assert.equal((markup.match(/data-photo-module=/g)||[]).length,count);assert.match(markup,/data-generated="true"/);assert.match(markup,/viewBox="-8 0 \d+ 100"/);assert.equal(new Set([...markup.matchAll(/<image href="([^"]+)"/g)].map(m=>m[1])).size,1);}
 }
});
test('KID ordinary ends and chaise share a frontal reference without changing module count',async()=>{
 const {readFile}=await import('node:fs/promises');const {products}=JSON.parse(await readFile(new URL('./fixtures/module-photo-catalog.json',import.meta.url),'utf8'));
 for(const series of ['Kid Isa, natur','Kid Juno, beige']){
  const ps=products.filter(p=>p.moduleSeries===series),left=ps.find(p=>p.moduleRole==='left'),right=ps.find(p=>p.moduleRole==='right'&&!/sjeselong/.test(p.name)),middle=ps.find(p=>p.moduleRole==='middle'),chaise=ps.find(p=>/sjeselong/.test(p.name));
  for(const rightEnd of [right,...(chaise?[chaise]:[])])for(const mids of [0,1,2]){const selection={[left.id]:1,[rightEnd.id]:1,[middle.id]:mids},markup=modulePhotoPreview(ps,selection);assert.equal((markup.match(/data-photo-module=/g)||[]).length,mids+2);assert.match(markup,/data-generated="true"/);assert.equal(new Set([...markup.matchAll(/<image href="([^"]+)"/g)].map(m=>m[1])).size,1);if(rightEnd===chaise)assert.match(markup,/110" role="img"/);}
  assert.ok(!modulePhotoPreview(ps,{[middle.id]:1}).includes('data-generated="true"'));
 }
});
test('replacing a catalogue image does not silently reuse an old generated reference',async()=>{
 const {joinedPhotoParts}=await import('../public/module-joined-profiles.js');
 const p=product('obj_c274f2d322614de4be80c2b891a78174','middle',70);
 assert.equal(joinedPhotoParts(modulePhotoParts([p],{[p.id]:2})),false);
});

test('local supplier photos retain the Senzo assembly and match original aliases',()=>{
 const base={id:'obj_4e31c6c5bcca4f91abad27609806ac0f',name:'Senzo grunnsofa',moduleSeries:'Senzo',moduleRole:'base',moduleWidth:220,image:photoProfiles.obj_4e31c6c5bcca4f91abad27609806ac0f.source};
 const middle={id:'obj_742f0d2dc6e24339ae594b05ac88c747',name:'Senzo midtmodul',moduleSeries:'Senzo',moduleRole:'middle',moduleWidth:80,image:photoProfiles.obj_742f0d2dc6e24339ae594b05ac88c747.source};
 const selection={[base.id]:1,[middle.id]:1};
 const local=modulePhotoPreview([base,middle],selection);
 const legacy=modulePhotoPreview([{...base,image:photoProfiles[base.id].aliases[0]},{...middle,image:photoProfiles[middle.id].aliases[0]}],selection);
 assert.equal(local,legacy);
 assert.doesNotMatch(local,/href="https?:/);
 assert.equal((local.match(/data-photo-module=/g)||[]).length,3);
 const replacement=modulePhotoPreview([{...base,image:'/media/new-admin-image'},middle],selection);
 assert.match(replacement,/href="\/media\/new-admin-image"/);
});
