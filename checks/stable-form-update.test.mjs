import test from 'node:test';
import assert from 'node:assert/strict';
import {stableFormUpdate} from '../public/stable-form-update.js';
test('modal updates restore page and nested scrolling immediately and after browser focus restoration',()=>{
 const panel={scrollHeight:800,clientHeight:400,scrollLeft:0,scrollTop:120,isConnected:true,parentElement:null},calls=[],frames=[];
 const host={scrollX:0,scrollY:600,document:{activeElement:{parentElement:panel}},scrollTo:value=>calls.push(value),requestAnimationFrame:fn=>frames.push(fn)};
 assert.equal(stableFormUpdate(()=>{panel.scrollTop=0;return 7;},host),7);assert.equal(panel.scrollTop,120);assert.equal(calls[0].top,600);
 panel.scrollTop=30;frames[0]();assert.equal(panel.scrollTop,120);assert.equal(calls[1].top,600);
});
