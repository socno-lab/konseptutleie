import test from 'node:test';import assert from 'node:assert/strict';
import {packageLineRentalPrice} from '../public/enquiry-price-model.js';
import {enquiryPageHtml} from '../server/enquiry-page.mjs';
import {createServer} from '../app-server.mjs';
const money=n=>n+' kr',chair={id:'chair',price:100,weekPrice:400,monthPrice:1000},addon={id:'extra',price:250,rentalPricingMode:'period'};
test('package line displays all tariffs before dates and actual quantity/cheapest plan after dates',()=>{
 assert.equal(packageLineRentalPrice(chair,2,null,[chair],money),'100 kr / døgn · 400 kr / uke · 1000 kr / måned per stk.');
 assert.equal(packageLineRentalPrice(chair,2,3,[chair],money),'600 kr for 2 stk. · 3 døgn');
 assert.equal(packageLineRentalPrice(chair,2,6,[chair],money),'800 kr for 2 stk. · 6 døgn');
 assert.equal(packageLineRentalPrice(addon,2,31,[chair,addon],money),'1000 kr for 2 stk. · 31 døgn');
 assert.equal(packageLineRentalPrice({...chair,priceOnRequest:true},2,3,[chair],money),'Pris på forespørsel');
});
test('checkout shell reuses form and retains hidden catalog hooks without duplicate mains being visible',()=>{
 const source='<html><head><title>Utvalg</title></head><body class="catalog-page"><main><div id="products"></div></main><dialog id="cart"><form id="requestForm"></form></dialog></body></html>';
 const html=enquiryPageHtml(source);assert.match(html,/data-enquiry-page="true"/);assert.match(html,/<main hidden inert>/);assert.match(html,/id="enquiryPage"/);assert.match(html,/id="requestForm"/);assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(enquiryPageHtml(source,'buy'),/Din kjøpsforespørsel/);
});
test('dedicated rental and purchase checkout routes serve the correct bootstrap and are never indexed',async()=>{
 const server=createServer({env:{NODE_ENV:'test'}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{for(const suffix of ['','?type=kjop']){const res=await fetch('http://127.0.0.1:'+server.address().port+'/foresporsel.html'+suffix),html=await res.text();assert.equal(res.status,200);assert.match(res.headers.get('x-robots-tag'),/noindex/);assert.match(html,suffix?/id="saleRequestForm"/:/id="requestForm"/);assert.match(html,/enquiry-page.css/);}}
 finally{await new Promise(resolve=>server.close(resolve));}
});
