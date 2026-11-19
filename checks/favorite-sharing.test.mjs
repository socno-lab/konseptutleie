import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHeaderCatalog} from '../public/header-catalog-model.js';
import {favoriteShareUrl,parseSharedFavorites,resolveSharedFavorites,mergeSharedFavorites} from '../public/favorite-sharing.js';

const product=(id,extra={})=>({id,name:id,category:'Stoler',active:true,rentalEnabled:true,saleEnabled:true,...extra});
const origin='https://konseptuell.no';

test('sharing round trips public product IDs across rental, purchase and grouped products',()=>{
 const entries=buildHeaderCatalog([
  product('rent',{saleEnabled:false}),product('buy',{rentalEnabled:false}),
  product('sofa_left',{category:'Sofaer',moduleSeries:'Modulsofa, lys blå'}),product('sofa_right',{category:'Sofaer',moduleSeries:'Modulsofa, lys blå'}),
  product('lamp_red',{category:'Belysning',variantGroup:'Lampeserie',variantLabel:'Rød'}),product('lamp_green',{category:'Belysning',variantGroup:'Lampeserie',variantLabel:'Grønn'})
 ]);
 const ids=entries.map(entry=>entry.id),url=new URL(favoriteShareUrl(ids,entries,origin)),shared=parseSharedFavorites(url.hash),resolved=resolveSharedFavorites(shared,entries);
 assert.equal(url.origin,origin);assert.equal(url.pathname,'/');assert.equal(url.search,'');
 assert.equal(shared.valid,true);assert.equal(shared.productIds.length,4);assert.equal(resolved.missing,0);
 assert.deepEqual(resolved.entries.map(entry=>entry.id),ids);
 assert.equal(resolved.entries.find(entry=>entry.productIds.includes('rent')).buyHref,'');
 assert.equal(resolved.entries.find(entry=>entry.productIds.includes('buy')).rentHref,'');
 assert.ok(!url.href.includes('Modulsofa'),'family names and other metadata are not serialized');
});

test('opening a shared list never modifies or merges the recipient favorites implicitly',()=>{
 const existing=Object.freeze(['product:own']),entries=buildHeaderCatalog([product('own'),product('someone_else')]);
 const shared=Object.freeze(parseSharedFavorites('#favoritter=v1.someone_else'));
 const resolved=resolveSharedFavorites(shared,entries);
 assert.deepEqual(existing,['product:own']);assert.deepEqual(resolved.entries.map(entry=>entry.id),['product:someone_else']);
 const saved=mergeSharedFavorites(existing,resolved.entries.map(entry=>entry.id));
 assert.deepEqual(saved,{ids:['product:own','product:someone_else'],added:1,skipped:0});
 assert.deepEqual(existing,['product:own']);
});

test('only known share fragments are intercepted and malformed payloads fail closed',()=>{
 for(const hash of ['',null,undefined,'#utvalg','#personvern','#favoritterish=v1.chair'])assert.equal(parseSharedFavorites(hash),null);
 for(const hash of ['#favoritter=','#favoritter=v1.','#favoritter=v2.chair','#favoritter=v1.chair.','#favoritter=v1.<script>','#favoritter=v1.%3Cscript%3E','#favoritter=v1.https://evil.test','#favoritter=v1...','#favoritter=v1.chair&email=someone@example.com','#favoritter=v1.'+'x'.repeat(81),'#favoritter=v1.'+'x'.repeat(9000)]){
  assert.deepEqual(parseSharedFavorites(hash),{valid:false,productIds:[]},hash.slice(0,120));
 }
});

test('share lists enforce 100 products, deduplicate IDs and exclude removed or private catalogue entries',()=>{
 const entries=buildHeaderCatalog([product('chair'),product('hidden',{active:false}),product('deleted',{deletedAt:'2026-01-01'}),product('extra',{addonOnly:true})]);
 assert.deepEqual(parseSharedFavorites('#favoritter=v1.chair.chair').productIds,['chair']);
 const shared=parseSharedFavorites('#favoritter=v1.chair.hidden.deleted.extra'),resolved=resolveSharedFavorites(shared,entries);
 assert.equal(resolved.entries.length,1);assert.equal(resolved.entries[0].id,'product:chair');assert.equal(resolved.missing,3);
 assert.equal(parseSharedFavorites('#favoritter=v1.'+Array.from({length:100},(_,i)=>'p'+i).join('.')).valid,true);
 assert.equal(parseSharedFavorites('#favoritter=v1.'+Array.from({length:101},(_,i)=>'p'+i).join('.')).valid,false);
});

test('two linked members of the same family resolve to one favorite',()=>{
 const entries=buildHeaderCatalog([product('left',{moduleSeries:'Sofa'}),product('right',{moduleSeries:'Sofa'})]);
 const resolved=resolveSharedFavorites(parseSharedFavorites('#favoritter=v1.left.right'),entries);
 assert.equal(resolved.entries.length,1);assert.equal(resolved.missing,0);
});

test('sharing is a snapshot, ignores stale local IDs, and uses no query from the current page',()=>{
 const entries=buildHeaderCatalog([product('chair')]),favorites=['product:chair','product:missing'];
 const url=favoriteShareUrl(favorites,entries,origin+'/foresporsel.html?name=private#other');
 favorites.push('product:later');
 assert.equal(url,origin+'/#favoritter=v1.chair');
 assert.equal(favoriteShareUrl(['product:missing'],entries,origin),'');
 assert.equal(favoriteShareUrl([],entries,origin),'');
 assert.equal(favoriteShareUrl(['product:chair'],entries,'javascript:alert(1)'),'');
 assert.equal(favoriteShareUrl(['product:chair'],entries,'not a URL'),'');
});

test('saving shared favorites retains existing order and honors full-list limits without replacing items',()=>{
 const existing=Array.from({length:99},(_,i)=>'product:p'+i),before=[...existing];
 const result=mergeSharedFavorites(existing,['product:p1','product:new_one','product:new_two','product:new_two']);
 assert.equal(result.ids.length,100);assert.deepEqual(result.ids.slice(0,99),existing);
 assert.equal(result.ids[99],'product:new_one');assert.equal(result.added,1);assert.equal(result.skipped,1);
 assert.deepEqual(existing,before);
 assert.deepEqual(mergeSharedFavorites(result.ids,['product:new_three']),{ids:result.ids,added:0,skipped:1});
});
