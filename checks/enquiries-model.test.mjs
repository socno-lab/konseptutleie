import test from 'node:test';
import assert from 'node:assert/strict';
import {enquiryGroup,closedLabel} from '../public/admin/enquiries-model.js';
test('enquiries and sent offers stay new until accepted; confirmed rentals include future bookings',()=>{
 for(const status of ['new','offered'])assert.equal(enquiryGroup({status},'2026-11-20'),'new');
 assert.equal(enquiryGroup({status:'accepted'},'2026-11-20'),'accepted');
 assert.equal(enquiryGroup({status:'confirmed',pickupDate:'2026-12-07'},'2026-11-20'),'active');
});
test('confirmed rental remains active on return date and uses confirmed dates while draft changes',()=>{
 const r={status:'confirmed',pickupDate:'2027-01-01',reservation:{end:'2026-12-07'}};
 assert.equal(enquiryGroup(r,'2026-12-07'),'active');assert.equal(enquiryGroup(r,'2026-12-08'),'closed');
});
test('unsuccessful enquiries remain distinct from cancelled rentals in closed list',()=>{
 assert.equal(enquiryGroup({status:'cancelled'}),'closed');
 assert.equal(closedLabel({status:'cancelled',history:[{type:'offer'}]}),'Avsluttet uten bestilling');
 assert.equal(closedLabel({status:'cancelled',history:[{type:'confirmation'}]}),'Avsluttet leieforhold');
});
