import assert from 'node:assert/strict';
import {rentalEstimate,remaining} from '../public/catalog-model.js';
const products=[{id:'table',name:'VERTICUS',price:0,weekPrice:0,monthPrice:0,priceOnRequest:true,stock:15,unavailable:0,active:true,isPackage:false},{id:'sofa',name:'Sofa',price:1500,weekPrice:7500,monthPrice:22500,stock:2,unavailable:0,active:true,isPackage:false}];
const only=rentalEstimate({table:1},products,'2026-11-01','2026-11-06');assert.equal(only.total,null);assert.equal(only.hasUnpriced,true);assert.equal(only.lines[0].plan,null);
const mixed=rentalEstimate({table:1,sofa:1},products,'2026-11-01','2026-11-06');assert.equal(mixed.total,null);assert.equal(mixed.knownSubtotal,7500);assert.equal(mixed.lines[1].plan.total,7500);
assert.equal(remaining('table',{table:15},products),0);
console.log('Unpriced items never become free rentals; mixed totals and 15-item stock cap passed.');
