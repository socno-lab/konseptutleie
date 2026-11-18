import test from 'node:test';
import assert from 'node:assert/strict';
import {proposalInitialValues} from '../public/proposal-draft.js';
const rent={start:'2026-12-01',end:'2026-12-31',name:'Kari',email:'kari@example.invalid'};
test('new proposals have no automatic period, while retaining contact and request context',()=>{
 const values=proposalInitialValues({rent,custom:{text:'En lounge'}});
 assert.equal(values.period,'');assert.equal(values.name,'Kari');assert.equal(values.customRequest,'En lounge');
 assert.equal(proposalInitialValues().period,'');
 assert.deepEqual(rent,{start:'2026-12-01',end:'2026-12-31',name:'Kari',email:'kari@example.invalid'});
});
test('legacy copied dates are cleared without deleting other draft fields',()=>{
 const draft={period:'2026-12-01 – 2026-12-31',customRequest:'Messe',place:'Oslo',budget:'10000'};
 assert.deepEqual(proposalInitialValues({draft,rent}),{...draft,period:''});
 assert.equal(draft.period,'2026-12-01 – 2026-12-31');
});
test('customer-entered periods, including an explicit match to basket dates, survive reopening',()=>{
 for(const period of ['','Ikke bestemt','Helgen 5.–6. desember','2026-12-01 – 2026-12-31']){
  const draft={period,periodSource:'customer'};
  assert.equal(proposalInitialValues({draft,rent}).period,period);
 }
 assert.equal(proposalInitialValues({draft:{period:'En helg i desember'},rent}).period,'En helg i desember');
});
