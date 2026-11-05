import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {createMysqlStore} from '../server/store.mjs';
import {groupMail} from '../public/admin/mail-model.js';
import {defaultSettings,validateSiteSettings} from '../public/site-settings.js';
test('mail groups preserve both recipients, put old problems before recent success, and search across all groups',()=>{
 const rows=[{reference:'old',channel:'customer',status:'uncertain',receivedAt:1},{reference:'old',channel:'internal',status:'sent',receivedAt:1},{reference:'new',channel:'customer',status:'sent',receivedAt:2}];
 const original=structuredClone(rows);assert.deepEqual(groupMail(rows).map(g=>g.reference),['old','new']);assert.equal(groupMail(rows)[0].channels.internal.status,'sent');
 assert.deepEqual(groupMail(rows,{status:'attention'}).map(g=>g.reference),['old']);assert.equal(groupMail(rows,{query:'NEW',status:'sent'})[0].reference,'new');assert.equal(groupMail(rows,{query:'new',status:'uncertain'}).length,0);assert.deepEqual(rows,original);
});
test('image display names preserve source URLs and reject invalid or duplicated metadata',()=>{
 const raw={...structuredClone(defaultSettings),imageNames:[{url:'/assets/tree.jpg',name:'Jul – hovedbilde'}]};assert.deepEqual(validateSiteSettings(raw).imageNames,raw.imageNames);assert.deepEqual(validateSiteSettings(defaultSettings).imageNames,[]);
 for(const imageNames of [[{url:'javascript:alert(1)',name:'Bad'}],[{url:'/assets/tree.jpg',name:'<script>'}],[raw.imageNames[0],raw.imageNames[0]]])assert.throws(()=>validateSiteSettings({...raw,imageNames}));
});
test('mail health store escapes reserved SQL alias and passes overdue cutoff; list keeps complete recipient pairs',async()=>{
 const original=mysql.createPool,calls=[];
 const connection={async beginTransaction(){},async execute(sql){return [[{body:JSON.stringify(sql.includes('ku_site_settings')?defaultSettings:[])}]];},async commit(){},async rollback(){},release(){}};
 mysql.createPool=()=>({async query(){},async getConnection(){return connection;},async end(){},async execute(sql,args){calls.push([sql,args]);if(sql.startsWith('SELECT SUM')){assert.match(sql,/AS `delayed`/);return [[{failed:0,uncertain:1,delayed:2}]];}return [[]];}});
 try{const store=createMysqlStore({DB_HOST:'fixture',DB_USER:'fixture',DB_NAME:'fixture',DB_PASSWORD:'fixture'},{products:[]});assert.deepEqual(await store.enquiryMailHealth(2000000),{failed:0,uncertain:1,delayed:2});assert.deepEqual(calls.find(([sql])=>sql.startsWith('SELECT SUM'))[1],[2000000,1100000]);await store.enquiryMailStatus();assert.doesNotMatch(calls.at(-1)[0],/LIMIT 200/);await store.close();}finally{mysql.createPool=original;}
});
