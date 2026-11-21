import test from 'node:test';
import assert from 'node:assert/strict';
import {weekendRentalEnd} from '../public/weekend-rental.js';
import {enquiryLineTotal} from '../public/admin/enquiry-line-pricing.js';
const p={id:'chair',active:true,price:100,weekPrice:700,monthPrice:3000,rentalPricingMode:'manual'};
test('one weekend day costs two days only with Friday to Monday possession, including self pickup',()=>{
 const period={start:'2030-11-02',end:'2030-11-02',scope:'standard'};
 assert.equal(weekendRentalEnd(period),'2030-11-03');assert.equal(weekendRentalEnd({...period,scope:'messe',mode:'pickup'}),'2030-11-03');
 assert.equal(weekendRentalEnd({...period,deliveryDate:period.start,pickupDate:period.end}),period.end);
 assert.equal(enquiryLineTotal(p,{...period,quantity:1},[p]),200);assert.equal(enquiryLineTotal(p,{...period,quantity:1,deliveryDate:period.start,pickupDate:period.end},[p]),100);
});
test('twenty days ending Saturday keep twenty days of pricing with Monday collection',()=>{
 const period={start:'2030-10-14',end:'2030-11-02',scope:'standard',deliveryDate:'2030-10-14',pickupDate:'2030-11-04'};
 assert.equal(weekendRentalEnd(period),period.end);assert.equal(enquiryLineTotal(p,{...period,quantity:1},[p]),enquiryLineTotal(p,{...period,pickupDate:period.end,quantity:1},[p]));
});
