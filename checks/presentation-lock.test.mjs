import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {assertPresentationLock,presentationSources,verifyPresentation} from '../server/presentation-lock.mjs';
const baseline=JSON.parse(await readFile(new URL('../reference/presentation-design-lock.json',import.meta.url),'utf8'));
test('the approved common presentation passes the publication guard',async()=>{await assertPresentationLock();});
test('the common guard rejects changed basket icon size, service price type and confirmation layout',async()=>{
 const source=await presentationSources();
 for(const [key,change] of [['public/cart-addons.css',s=>s+'\n#cart .cart-addon svg{width:72px}'],['public/service-detail.css',s=>s.replace('font-size:13px','font-size:20px')],['confirmation-rendering',s=>s.replace("imageBox.style.alignSelf='center'","imageBox.style.alignSelf='start'")]]){
  const changed={...source,[key]:change(source[key])};assert.notEqual(changed[key],source[key]);assert.throws(()=>verifyPresentation(changed,baseline),/DESIGNLÅS/);
 }
});
