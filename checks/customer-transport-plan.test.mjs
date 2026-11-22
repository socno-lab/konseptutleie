import test from 'node:test';
import assert from 'node:assert/strict';
import {customerTransportPlan,customerTransportError} from '../public/customer-transport-plan.js';
import {addDateDays} from '../public/rental-dates.js';
test('all weekday combinations share event eligibility and exact tentative dates',()=>{
 for(let first=0;first<7;first++)for(let duration=0;duration<8;duration++){
  const start=addDateDays('2030-11-04',first),end=addDateDays(start,duration),plan=customerTransportPlan({start,end,scope:'messe'});
  for(const mode of ['pickup','delivery','deliveryOnly','collectionOnly','undecided']){const valid=plan.allowedModes.includes(mode);const options={start,end,scope:'messe',mode,deliveryDate:plan.deliveryDate,pickupDate:plan.pickupDate};
   // Dates are mode-dependent for warehouse endpoints.
   const actual=customerTransportPlan(options);assert.equal(customerTransportError({...options,...actual})==='',valid);
  }
 }
});
test('housing keeps weekday warehouse dates and rejects customer-side date overrides',()=>{
 const options={start:'2030-11-02',end:'2030-11-03',scope:'standard',mode:'pickup'},plan=customerTransportPlan(options);assert.equal(plan.deliveryDate,'2030-11-01');assert.equal(plan.pickupDate,'2030-11-04');assert.equal(plan.allowedModes.length,5);assert.match(customerTransportError({...options,pickupDate:'2030-11-03'}),/Transportdatoene/);
});
