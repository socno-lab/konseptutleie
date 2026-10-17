import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../app-server.mjs';
import http from 'node:http';

test('Preview stays available while custom-domain pages and APIs remain unpublished',async()=>{
 const server=createServer({env:{}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  const preview=await fetch(origin+'/');assert.equal(preview.status,200);assert.match(preview.headers.get('x-robots-tag'),/noindex/);assert.match(await preview.text(),/name="robots" content="noindex/);
  assert.equal((await fetch(origin+'/api/catalog')).status,200);
  for(const host of ['konseptboligstyling.com','www.konseptboligstyling.com'])for(const path of ['/','/api/catalog','/admin']){
   const response=await new Promise((resolve,reject)=>{http.get(origin+path,{headers:{Host:host}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));}).on('error',reject);});assert.equal(response.status,404);assert.match(response.body,/ikke publisert/);assert.match(response.headers['x-robots-tag'],/noindex/);
  }
  assert.equal((await fetch(origin+'/',{headers:{'X-Forwarded-Host':'www.konseptboligstyling.com'}})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
