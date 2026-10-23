import test from 'node:test';
import assert from 'node:assert/strict';
import {ratePlan} from '../public/catalog-model.js';
import {resolvedRentalRates} from '../public/rental-pricing-model.js';
import {rentalDeliveryCapacity,requiresTwoPeople} from '../public/delivery-model.js';
const tree={id:'tree',name:'Pyntet juletre 180 cm',price:9875,weekPrice:9875,monthPrice:9875,rentalPricingMode:'fixed',deliveryIncluded:true};
test('season tree price stays fixed for short and long periods and all uses',()=>{for(const days of [1,30,60,90])assert.equal(ratePlan(tree,days).total,9875);assert.equal(resolvedRentalRates(tree,[],'messe').price,9875);});
test('included tree delivery does not remove transport for other products',()=>{const chair={id:'chair',name:'Stol',category:'Stoler'},sofa={id:'sofa',name:'Sofa',type:'sofa'};const products=[tree,chair,sofa];assert.equal(rentalDeliveryCapacity({tree:1},products).includedOnly,true);assert.equal(rentalDeliveryCapacity({tree:1,chair:1},products).includedOnly,false);assert.equal(rentalDeliveryCapacity({tree:20,chair:1},products).other,1);assert.equal(requiresTwoPeople({tree:1,sofa:1},products),true);assert.equal(rentalDeliveryCapacity({tree:1},products,true).manual,true);});
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
test('server receipt includes tree transport but requires transport price for an additional chair',()=>{
 const chair={id:'chair',name:'Stol',active:true,stock:10,unavailable:0,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500};
 const products=[{...tree,active:true,stock:1,unavailable:0},chair],value={id:'test',kind:'rental',name:'Emilie Eksempel',email:'kunde@example.invalid'},details={phone:'00000000',address:'Eksempelveien 12, 1470 Eksempelsted',occasion:'Bedrift',delivery:'Ønsker levering og henting',start:'2026-11-15',end:'2027-01-15'};
 const alone=createEnquirySnapshot(value,{basket:{tree:1},details},products);assert.equal(alone.total,9875);assert.equal(alone.delivery.total,0);assert.match(alone.delivery.label,/inkludert/);
 const mixed=createEnquirySnapshot(value,{basket:{tree:1,chair:1},details},products);assert.equal(mixed.delivery.total,null);assert.equal(mixed.total,null);
 const priced=createEnquirySnapshot(value,{basket:{tree:1,chair:1},details},products,{verifyDelivery:()=>({total:1380})});assert.equal(priced.delivery.total,1380);
});
