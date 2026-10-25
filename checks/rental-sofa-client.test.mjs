import test from 'node:test';
import assert from 'node:assert/strict';
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.textContent='';}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 focus(){}
}
globalThis.document={querySelectorAll:()=>[],createElement:tag=>new Element(tag),body:new Element('body'),documentElement:new Element('html')};
globalThis.window={scrollTo(){}};globalThis.requestAnimationFrame=callback=>callback();
const {submitEnquiry,enquiryReceipt,showEnquiryConfirmation}=await import('../public/submission-ui.js');
const text=node=>[node.textContent,...node.children.map(text)].join(' ');
test('fixed and custom package web receipts keep line prices and final total without package subtotals',()=>{
 for(const custom of [false,true]){
  const group={id:'fixed:pack',name:'Loungepakken',quantity:1,custom};
  const receipt={lines:[{id:'chair',name:'Lenestol',quantity:2,basis:'Pris per stk.',total:8920,group},{id:'textile',name:'Tekstilpakke',quantity:1,basis:'Per 30 dager',total:250,group,addonFor:[{id:'chair',name:'Lenestol'}]}],facts:[],delivery:{label:'Levering og henting',total:1000},total:10170,vatIncluded:true};
  const rendered=text(enquiryReceipt(receipt));
  assert.doesNotMatch(rendered,/Delsum/);assert.match(rendered,/Loungepakken/);assert.match(rendered,/8\s*920 kr/);assert.match(rendered,/250 kr/);assert.match(rendered,/Transport/);assert.match(rendered,/Beregnet leiesum inkl. transport: 10\s*170 kr/);
 }
});
test('client sends each rental sofa and its textile allocation unchanged through a retry',async()=>{
 const nativeFormData=globalThis.FormData,oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage,calls=[];
 const rentalSofas=[{id:'a',series:'Sofa',selection:{end:2},textileId:''},{id:'b',series:'Sofa',selection:{end:2,middle:1},textileId:'textile'}];
 globalThis.FormData=class{[Symbol.iterator](){return Object.entries({name:'Lokal kontroll',email:'test@example.invalid',rentalTermsAccepted:'test-only'})[Symbol.iterator]();}};globalThis.sessionStorage={getItem:()=>null,setItem:()=>{}};
 globalThis.fetch=async(url,init)=>{calls.push(JSON.parse(init.body));return calls.length===1?new Response('<html>Restart</html>',{status:503}):Response.json({ok:true,reference:'local',receipt:{acquisition:'rental',lines:[]}});};
 try{await submitEnquiry({},{kind:'rental',basket:{end:4,middle:1,textile:1},rentalSofas});assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.deepEqual(calls[0].rentalSofas,rentalSofas);assert.equal(calls[0].basket.textile,1);}finally{globalThis.FormData=nativeFormData;globalThis.fetch=oldFetch;globalThis.sessionStorage=oldStorage;}
});
test('web receipt renders sofa groups and compact textile in its group, and confirmation uses acquisition rather than transport kind',()=>{
 const first={id:'rental-sofa:a',type:'sofa',name:'Sofa · Sofa 1',quantity:1,description:'2 moduler · ca. 180 cm bred'},second={...first,id:'rental-sofa:b',name:'Sofa · Sofa 2'};
 const receipt={acquisition:'rental',lines:[{id:'end',name:'Endemodul',quantity:2,basis:'Pris per stk.',total:200,group:first,image:'/assets/beige-endemodul.webp'},{id:'textile',name:'Tekstilpakke',quantity:1,basis:'400 kr per 30 dager',total:400,group:first,addonFor:[{id:'end',name:first.name}],image:'/assets/addon-pillow.png'},{id:'end',name:'Endemodul',quantity:2,basis:'Pris per stk.',total:200,group:second}],facts:[],delivery:{label:'Henter selv etter avtale',total:0},total:800,vatIncluded:true};
 const section=enquiryReceipt(receipt);assert.doesNotMatch(text(section),/Delsum/);assert.match(text(section),/Beregnet leiesum: 800 kr/);const headings=section.children.filter(el=>el.tagName==='h3');assert.deepEqual(headings.map(el=>el.textContent),[first.name,second.name]);assert.ok(!headings.some(el=>el.textContent.includes('pakke')));
 const texts=section.children.map(text);assert.ok(texts.findIndex(t=>t.includes('+ Tekstilpakke'))<texts.indexOf(second.name));const addon=section.children.find(el=>text(el).includes('+ Tekstilpakke'));assert.equal(addon.children[0].style.alignSelf,'center');assert.equal(addon.children[0].children[0].width,24);
 for(const [acquisition,expected] of [['purchase','Din kjøpsforespørsel er sendt inn'],['rental','Din leieforespørsel er sendt inn'],['mixed','Din forespørsel om leie og kjøp er sendt inn']]){showEnquiryConfirmation({reference:'local',kind:'rental',email:'test@example.invalid',receipt:{...receipt,acquisition}});assert.ok(text(document.body).includes(expected));}
});
