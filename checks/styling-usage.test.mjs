import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stylingUsage} from '../server/styling-usage.mjs';

test('usage deduplicates jobs, clips overlapping durations and separates never used from not yet approved',()=>{
 const day=86400000,now=100*day;
 const products=['chairs','lamp','new','old'].map(id=>({id,name:id}));
 const history=[];
 const add=(item,product,events)=>events.forEach(([state,at,job])=>history.push({item,product,state,created:at*day,job}));
 add('a','chairs',[['ready',50],['out',65,'a'],['check',72],['ready',75],['out',95,'b']]);
 add('b','chairs',[['ready',60],['out',95,'b'],['check',98]]);
 add('c','lamp',[['held',80],['ready',88]]);
 add('d','new',[['held',98]]);
 add('e','old',[['out',60,'z'],['check',62]]);
 const result=Object.fromEntries(stylingUsage(products,history,'30',now).map(p=>[p.id,p]));
 assert.deepEqual(result.chairs,{id:'chairs',name:'chairs',jobs:1,checkouts:2,unitsUsed:2,approved:2,first:50*day,everUsed:true,days:10,daysPerUnit:5});
 assert.equal(result.lamp.everUsed,false);
 assert.equal(result.new,undefined);
 assert.equal(result.old.everUsed,true);
 assert.equal(result.old.jobs,0);
});
