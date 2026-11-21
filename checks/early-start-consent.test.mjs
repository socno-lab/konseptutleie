import test from 'node:test';import assert from 'node:assert/strict';
import {earlyStartRequirement} from '../server/early-start-consent.mjs';
test('early start uses actual delivery date, Oslo date, and is limited to consumers',()=>{
 const now=new Date('2026-11-20T23:30:00Z'),r={deliveryDate:'2026-12-04',start:'2026-12-05'};
 assert.equal(earlyStartRequirement(r,now).required,true);
 assert.equal(earlyStartRequirement({...r,customerType:'business'},now).required,false);
 assert.equal(earlyStartRequirement({deliveryDate:'2026-12-08'},now).required,false);
 assert.equal(earlyStartRequirement({deliveryDate:'2026-11-20'},now).required,false);
 assert.equal(earlyStartRequirement(r,now).deadline,'2026-12-07');
});
test('withdrawal deadline extends past Norwegian public holidays and weekends',()=>{
 assert.equal(earlyStartRequirement({deliveryDate:'2029-01-02'},new Date('2028-12-16T10:00:00Z')).deadline,'2029-01-02');
 assert.equal(earlyStartRequirement({deliveryDate:'2026-12-28'},new Date('2026-12-11T10:00:00Z')).deadline,'2026-12-28');
 assert.equal(earlyStartRequirement({deliveryDate:'2026-04-07'},new Date('2026-03-20T10:00:00Z')).deadline,'2026-04-07');
});
