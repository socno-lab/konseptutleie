import test from 'node:test';
import assert from 'node:assert/strict';
import {mountMobileRentalDates,rentalPickerPeriod} from '../public/mobile-rental-dates.js';
import {osloToday,addDateDays,MAX_RENTAL_DAYS} from '../public/rental-dates.js';

test('picker shares strict date-only and inclusive 365-day validation with server dates',()=>{
 const today='2026-10-24',last=addDateDays(today,MAX_RENTAL_DAYS-1);assert.equal(rentalPickerPeriod(today,last,{today}).days,365);assert.equal(rentalPickerPeriod(today,addDateDays(last,1),{today}).valid,false);
 assert.equal(rentalPickerPeriod('2026-02-30','2026-03-02',{today:'2026-01-01'}).valid,false);assert.equal(rentalPickerPeriod('2026-10-23','2026-10-25',{today}).valid,false);assert.equal(rentalPickerPeriod(today,today,{today}).days,1);
 assert.equal(rentalPickerPeriod('2028-02-28','2028-03-01',{today:'2028-01-01'}).days,3);
});

// A small DOM test-double exercises the actual picker listeners without browser,
// network, CSS snapshots or duplicating its validation implementation.
class Element{
 constructor(){this.listeners=new Map();this.nodes=new Map();this.dataset={};this.children=[];this.value='';this.disabled=false;this.required=false;this.open=false;}
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector);}
 setAttribute(name,value){this[name]=value;}
 append(node){this.children.push(node);}
 replaceChildren(){this.children=[];}
 after(node){this.trigger=node;}
 addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
 dispatchEvent(event){for(const fn of this.listeners.get(event.type)||[])fn(event);return true;}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 closest(){return this;}
 hasAttribute(name){return this[name]!==undefined;}
}
test('opening refreshes Oslo minimum and confirm rejects invalid/long drafts before committing fields',()=>{
 const previousDocument=globalThis.document,head=new Element(),body=new Element();globalThis.document={head,body,createElement:()=>new Element()};
 try{
  const form=new Element(),start=form.querySelector('#start'),end=form.querySelector('#end');start.required=end.required=true;start.min=end.min='1900-01-01';mountMobileRentalDates(form);
  start.trigger.dispatchEvent({type:'click'});const calendar=body.children[0],today=osloToday(),click=button=>calendar.dispatchEvent({type:'click',target:button}),day=value=>{const button=new Element();button.dataset.date=value;return button;};
  assert.equal(start.min,today);assert.equal(end.min,today);assert.equal(calendar.open,true);assert.equal(calendar.querySelector('[data-date-confirm]').disabled,true);
  click(day(today));click(day(addDateDays(today,MAX_RENTAL_DAYS)));assert.equal(calendar.querySelector('[data-date-confirm]').disabled,true);assert.equal(start.value,'');assert.match(calendar.querySelector('.date-instruction').textContent,/365/);
  const reset=calendar.querySelector('[data-date-reset]');reset['data-date-reset']='';click(reset);click(day(today));click(day(addDateDays(today,MAX_RENTAL_DAYS-1)));const confirm=calendar.querySelector('[data-date-confirm]');confirm['data-date-confirm']='';assert.equal(confirm.disabled,false);click(confirm);
  assert.equal(start.value,today);assert.equal(end.value,addDateDays(today,364));assert.equal(calendar.open,false);
  start.value='1900-01-01';end.value=today;let prevented=false,stopped=false;form.dispatchEvent({type:'submit',preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});assert.equal(prevented,true);assert.equal(stopped,true);assert.equal(calendar.open,true);assert.match(calendar.querySelector('.date-instruction').textContent,/dagens dato/);
 }finally{globalThis.document=previousDocument;}
});
