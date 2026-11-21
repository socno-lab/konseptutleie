import test from 'node:test';import assert from 'node:assert/strict';
import {adminDateKeys,parseAdminDate,displayAdminDate,collectAdminDates,bindAdminDateFields,readAdminDateField,setAdminDateField} from '../public/admin/date-fields.js';
import {workflowRecord,editWorkflow} from '../server/enquiry-workflow.mjs';
import {configureSiteSettings,defaultSettings} from '../public/site-settings.js?v=fest20261114';
function fields(values){const items=Object.fromEntries(adminDateKeys.map(key=>[key,{value:values[key]||'',dataset:{dateLabel:key},error:'',setCustomValidity(value){this.error=value;},reportValidity(){return !this.error;}}]));return {items,querySelector(selector){return items[selector.slice(1)];}};}
test('visible Norwegian dates and ISO dates normalize to one strict calendar value',()=>{
 for(const text of ['21.11.2026','21. 11 . 2026','21/11/2026','2026-11-21'])assert.equal(parseAdminDate(text),'2026-11-21');
 assert.equal(parseAdminDate('1.2.2028'),'2028-02-01');assert.equal(parseAdminDate(''),'');assert.equal(displayAdminDate('2026-11-21'),'21.11.2026');
 for(const text of ['31.11.2026','29.02.2026','21.11.26','2026-13-21','21.11.2026 extra'])assert.equal(parseAdminDate(text),null);
});
test('required date fields cannot silently save empty, partial or reversed periods; new drafts may remain empty',()=>{
 assert.deepEqual(collectAdminDates(fields({})),{start:'',end:'',deliveryDate:'',pickupDate:''});assert.throws(()=>collectAdminDates(fields({}),true),/Kontroller/);
 assert.throws(()=>collectAdminDates(fields({start:'21.11.202',end:'21.11.2026'}),true),/Kontroller/);assert.throws(()=>collectAdminDates(fields({start:'22.11.2026',end:'21.11.2026'}),true),/leieperioden/);
});
test('calendar changes update the same visible value that collection submits',()=>{
 const text={value:'',listeners:{},setCustomValidity(){},addEventListener(type,fn){this.listeners[type]=fn;},dispatchEvent(event){this.lastEvent=event;}};
 const picker={value:'2026-11-21',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},parentElement:{querySelector(){return text;}}};text.parentElement={querySelector(){return picker;}};
 bindAdminDateFields({querySelectorAll(selector){return selector==='.admin-date-picker'?[picker]:[text];}});picker.listeners.change();assert.equal(text.value,'21.11.2026');assert.equal(readAdminDateField(text),'2026-11-21');assert.equal(text.lastEvent.type,'change');assert.equal(text.lastEvent.bubbles,true);
 setAdminDateField(text,'2026-11-23');assert.equal(text.value,'23.11.2026');assert.equal(picker.value,'2026-11-23');
});
test('visible one-day event rental dates survive saving and price a retail chair at 420 kr',()=>{
 configureSiteSettings(defaultSettings);const p={id:'forma',name:'Hübsch Forma Dining Chair Natural',active:true,rentalPricingMode:'retail',purchaseUnitPrice:3950};
 const r={...workflowRecord({id:'proposal',kind:'rental',acquisition:'proposal',email:'test@example.invalid',lines:[]}),status:'accepted',lines:[{key:'0',id:p.id,name:p.name,quantity:1,total:null,review:'ok',originalId:p.id,originalName:p.name}]};
 const dates=collectAdminDates(fields({start:'21.11.2026',end:'21.11.2026',deliveryDate:'21.11.2026',pickupDate:'21.11.2026'}),true),saved=editWorkflow(r,{...r,...dates,scope:'messe',transport:0},[p]);
 assert.equal(saved.start,'2026-11-21');assert.equal(saved.end,'2026-11-21');assert.equal(saved.deliveryDate,'2026-11-21');assert.equal(saved.pickupDate,'2026-11-21');assert.equal(saved.lines[0].total,420);
 assert.throws(()=>editWorkflow(r,{...r,scope:'messe'},[p]),/Velg Leie fra/);
 const reopened=fields(Object.fromEntries(adminDateKeys.map(key=>[key,displayAdminDate(saved[key])])));assert.deepEqual(collectAdminDates(reopened,true),dates);
});
