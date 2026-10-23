import test from 'node:test';
import assert from 'node:assert/strict';
import {ratePlan} from '../public/catalog-model.js';
import {resolvedRentalRates} from '../public/rental-pricing-model.js';
import {rentalDeliveryCapacity,requiresTwoPeople} from '../public/delivery-model.js';
const tree={id:'tree',name:'Pyntet juletre 180 cm',price:9875,weekPrice:9875,monthPrice:9875,rentalPricingMode:'fixed',deliveryIncluded:true};
test('season tree price stays fixed for short and long periods and all uses',()=>{for(const days of [1,30,60,90])assert.equal(ratePlan(tree,days).total,9875);assert.equal(resolvedRentalRates(tree,[],'messe').price,9875);});
test('included tree delivery does not remove transport for other products',()=>{const chair={id:'chair',name:'Stol',category:'Stoler'},sofa={id:'sofa',name:'Sofa',type:'sofa'};const products=[tree,chair,sofa];assert.equal(rentalDeliveryCapacity({tree:1},products).includedOnly,true);assert.equal(rentalDeliveryCapacity({tree:1,chair:1},products).includedOnly,false);assert.equal(rentalDeliveryCapacity({tree:20,chair:1},products).other,1);assert.equal(requiresTwoPeople({tree:1,sofa:1},products),true);assert.equal(rentalDeliveryCapacity({tree:1},products,true).manual,true);});
