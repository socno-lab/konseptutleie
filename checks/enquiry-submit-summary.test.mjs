import test from 'node:test';
import assert from 'node:assert/strict';
import {submitSummaryModel,mountSubmitSummary} from '../public/enquiry-submit-summary.js';

const state=(extra={})=>({mode:'rental',hasItems:true,needsDates:true,datesReady:true,subtotal:1000,hasUnpriced:false,delivery:{total:0,included:false,label:'Henter og returnerer selv'},...extra});
const discount=(extra={})=>({code:'TEST10',pending:false,result:{subtotal:1000,discount:100,total:900,hasUnpriced:false},...extra});

test('summary preserves the calculated period price and adds transport once',()=>{
 // The date-aware calculator has already billed a 400-kr addon twice for 31 days.
 const result=submitSummaryModel(state({subtotal:800,delivery:{total:500,label:'Ønsker levering og henting'}}));
 assert.equal(result.hidden,false);assert.equal(result.total,1300);assert.equal(result.label,'Totalpris');
 assert.deepEqual(result.rows,[{label:'Leie',value:800},{label:'Transport',value:500}]);
 assert.match(result.note,/inkl\. mva/);assert.match(result.note,/uforpliktende/);
});

test('current discount reduces goods only; transport is added after discount',()=>{
 const result=submitSummaryModel(state({discount:discount(),delivery:{total:500,label:'Ønsker levering'}}));
 assert.equal(result.total,1400);assert.deepEqual(result.rows.find(row=>row.label.startsWith('Rabatt')),{label:'Rabatt · TEST10',value:-100});
 const mixed=submitSummaryModel(state({mode:'mixed',subtotal:5000,discount:discount(),delivery:{total:500,label:'Ønsker levering'}}));
 assert.equal(mixed.total,5400,'a discount on the rented part must not replace the purchase subtotal');
 assert.equal(mixed.label,'Beregnet sum for leie og kjøp inkl. transport');
});

test('missing dates, unknown goods and unknown transport never produce a complete numeric total',()=>{
 for(const change of [{datesReady:false},{hasUnpriced:true},{subtotal:null},{delivery:{total:null,label:'Avklares senere'}}])assert.equal(submitSummaryModel(state(change)).total,null);
 const noDates=submitSummaryModel(state({datesReady:false}));
 assert.deepEqual(noDates.rows[0],{label:'Delpris for prisede varer',value:1000});assert.ok(noDates.rows.some(row=>row.value==='Velg datoer'));
 const unpriced=submitSummaryModel(state({hasUnpriced:true,subtotal:0}));assert.equal(unpriced.total,null);assert.ok(!unpriced.rows.some(row=>/Delpris/.test(row.label)));
 const unknownDiscountItems=submitSummaryModel(state({discount:discount({result:{subtotal:1000,discount:100,total:900,hasUnpriced:true}})}));
 assert.equal(unknownDiscountItems.total,null);assert.equal(unknownDiscountItems.rows[0].label,'Delpris for prisede varer');
});

test('empty cart is hidden; known zero prices remain distinct from unknown prices',()=>{
 assert.equal(submitSummaryModel(state({hasItems:false})).hidden,true);
 assert.equal(submitSummaryModel(state({subtotal:0})).total,0);
 for(const subtotal of [NaN,Infinity,-100,'100'])assert.equal(submitSummaryModel(state({subtotal})).total,null);
 for(const total of [NaN,Infinity,-100,'0'])assert.equal(submitSummaryModel(state({delivery:{total}})).total,null);
});

test('purchase and included transport use receipt wording without a rental period or optional buyout',()=>{
 const purchase=submitSummaryModel(state({mode:'purchase',needsDates:false,datesReady:false,subtotal:31362,optionalBuyout:33762}));
 assert.equal(purchase.total,31362);assert.equal(purchase.label,'Beregnet kjøpesum');assert.ok(!purchase.rows.some(row=>row.label==='Leieperiode'));
 const included=submitSummaryModel(state({delivery:{total:0,included:true,label:'Levering og henting inkludert'}}));
 assert.equal(included.total,1000);assert.equal(included.label,'Totalpris');assert.deepEqual(included.rows.at(-1),{label:'Transport',value:'Inkludert'});
 const pickup=submitSummaryModel(state());assert.equal(pickup.label,'Totalpris');assert.deepEqual(pickup.rows.at(-1),{label:'Transport',value:0});
 const rentOnly=submitSummaryModel(state({purchaseTotal:30462,optionalBuyout:33762}));assert.equal(rentOnly.total,1000);assert.ok(!JSON.stringify(rentOnly).includes('33762'));
});

test('pending and rejected discounts cannot display an earlier discount as current',()=>{
 const pending=submitSummaryModel(state({discount:discount({pending:true})}));assert.equal(pending.total,null);assert.ok(!pending.rows.some(row=>row.label.startsWith('Rabatt')));assert.match(pending.note,/kontrolleres/);
 for(const result of [null,{subtotal:1000,discount:1100,total:0},{subtotal:1000,discount:100,total:1000},{subtotal:2000,discount:100,total:1900}]){
  const invalid=submitSummaryModel(state({discount:discount({result})}));assert.equal(invalid.total,1000);assert.ok(!invalid.rows.some(row=>row.label.startsWith('Rabatt')));assert.match(invalid.note,/ikke trukket fra/);
 }
 const noCode=submitSummaryModel(state({discount:discount({code:''})}));assert.equal(noCode.total,1000);assert.ok(!noCode.rows.some(row=>row.label.startsWith('Rabatt')));
});

test('stylist remains a separate quote, while currency calculations retain cents',()=>{
 const result=submitSummaryModel(state({subtotal:1000.55,stylist:true,discount:discount({result:{subtotal:1000.55,discount:100.06,total:900.49}}),delivery:{total:200.20,label:'Ønsker levering'}}));
 assert.equal(result.total,1100.69);assert.match(result.note,/Styling er ikke inkludert.*separat/);
});

function documentFixture(explicitSubmit=true){
 const created=[];
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.ownerDocument=doc;this._text='';this.hidden=false;}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  set innerHTML(value){assert.fail('Summary must never parse HTML: '+value);}
  setAttribute(name,value){this.attributes[name]=value;}
  append(...children){for(const child of children){child.parentNode=this;this.children.push(child);}}
  insertBefore(child,next){child.parentNode=this;const index=this.children.indexOf(next);assert.ok(index>=0);this.children.splice(index,0,child);}
  replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
  querySelector(selector){return selector==='[type="submit"]'?this.children.find(child=>child.attributes.type==='submit'):selector==='button:not([type])'?this.children.find(child=>child.tagName==='BUTTON'&&!child.attributes.type):null;}
 }
 const doc={createElement(tag){const node=new Element(tag);created.push(node);return node;}},form=doc.createElement('form'),button=doc.createElement('button');if(explicitSubmit)button.setAttribute('type','submit');form.append(button);
 return {form,button,created};
}

test('mount inserts one compact summary immediately before submit and renders hostile code text safely',()=>{
 const {form,button,created}=documentFixture(),api=mountSubmitSummary(form),section=form.children[0];
 assert.equal(form.children[1],button);assert.equal(section.tagName,'SECTION');assert.equal(section.attributes['aria-label'],'Prisoppsummering');assert.equal(section.hidden,true);assert.equal(mountSubmitSummary(form),api);
 const code='<img src=x onerror=alert(1)>',result=api.update(state({discount:discount({code})}));
 assert.equal(result.total,900);assert.equal(section.hidden,false);assert.ok(section.textContent.includes(code));assert.match(section.textContent,/−100 kr/);assert.match(section.textContent,/900 kr/);
 assert.ok(created.every(node=>['FORM','BUTTON','SECTION','DIV','SPAN','P'].includes(node.tagName)),'no bold headings or injected elements');
 api.update(state({hasItems:false}));assert.equal(section.hidden,true);assert.equal(section.children.length,0);assert.equal(form.children.length,2);
 api.update(state({subtotal:null}));assert.match(section.textContent,/Avklares i tilbudet/);
});

test('purchase forms with an implicit submit button receive the same summary',()=>{
 const {form,button}=documentFixture(false);mountSubmitSummary(form).update(state({mode:'purchase',needsDates:false}));
 assert.equal(form.children.length,2);assert.equal(form.children[1],button);assert.match(form.children[0].textContent,/Beregnet kjøpesum/);
});
