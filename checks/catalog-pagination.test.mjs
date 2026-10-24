import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCatalogPagination} from '../public/catalog-pagination.js';

// A small DOM adapter keeps these behavioural tests independent of browsers.
// Browser QA separately checks the real card markup and responsive layout.
class Element{
 constructor(doc,tag){this.ownerDocument=doc;this.tagName=tag.toUpperCase();this.childNodes=[];this.attributes=new Map();this.listeners=new Map();this.hidden=false;this.id='';}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.childNodes.push(node);}}
 remove(){if(this.parentNode){const siblings=this.parentNode.childNodes;siblings.splice(siblings.indexOf(this),1);this.parentNode=null;}}
 after(node){node.remove();const siblings=this.parentNode.childNodes;node.parentNode=this.parentNode;siblings.splice(siblings.indexOf(this)+1,0,node);}
 replaceChildren(...nodes){for(const child of [...this.childNodes])child.remove();this.append(...nodes);}
 setAttribute(name,value){this.attributes.set(name,String(value));}
 addEventListener(name,handler){this.listeners.set(name,handler);}
 removeEventListener(name,handler){if(this.listeners.get(name)===handler)this.listeners.delete(name);}
 click(){this.listeners.get('click')?.();}
 focus(options){this.ownerDocument.activeElement=this;this.ownerDocument.focusOptions=options;}
 insertAdjacentHTML(position,markup){assert.equal(position,'beforeend');for(const match of markup.matchAll(/<(article|aside)\b[^>]*>[\s\S]*?<\/\1>/g)){const node=new Element(this.ownerDocument,match[1]);node.markup=match[0];this.append(node);}}
}
function fixture(storage=null){const doc={createElement:tag=>new Element(doc,tag),defaultView:{sessionStorage:storage}},section=new Element(doc,'section'),grid=new Element(doc,'div');grid.id='products';section.append(grid);return {doc,section,grid,get controls(){return section.childNodes[1];}};}
function memoryStorage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
const products=Array.from({length:59},(_,index)=>({id:'product-'+index,name:'Produkt '+index}));
const renderItem=item=>'<article><a href="/leieprodukt.html?produkt='+item.id+'">'+item.name+'</a></article>';

test('only one batch is rendered initially, and further batches preserve cards, links and final teaser',()=>{
 const view=fixture(),rendered=[];
 const controller=mountCatalogPagination(view.grid,{items:products,key:'alle',renderItem:item=>{rendered.push(item.id);return renderItem(item);},tailHtml:'<aside>Finner du ikke det du leter etter?</aside>'});
 const [status,button]=view.controls.childNodes,first=view.grid.childNodes[0],tail=view.grid.childNodes.at(-1);
 assert.equal(rendered.length,24);assert.equal(controller.visibleCount,24);assert.equal(controller.total,59);
 assert.equal(view.grid.childNodes.length,25);assert.equal(status.textContent,'Viser 24 av 59 produkter');assert.equal(button.textContent,'Vis 24 flere');
 assert.equal(button.type,'button');assert.equal(button.attributes.get('aria-controls'),'products');
 assert.match(first.markup,/href="\/leieprodukt\.html\?produkt=product-0"/);
 button.click();
 assert.equal(rendered.length,48);assert.equal(controller.visibleCount,48);assert.equal(view.grid.childNodes[0],first);assert.equal(view.grid.childNodes.at(-1),tail);
 assert.equal(button.textContent,'Vis 11 flere');assert.match(view.grid.childNodes[47].markup,/product-47/);
 button.click();
 assert.equal(rendered.length,59);assert.equal(controller.visibleCount,59);assert.equal(view.grid.childNodes.at(-1),tail);assert.equal(button.hidden,true);
 assert.equal(status.textContent,'Viser 59 av 59 produkter');assert.equal(view.doc.activeElement,status);assert.deepEqual(view.doc.focusOptions,{preventScroll:true});
 controller.showMore();assert.equal(rendered.length,59);
});

test('basket or price refresh keeps the visible range; changing filters starts with 24',()=>{
 const view=fixture(),storage=memoryStorage();
 const controller=mountCatalogPagination(view.grid,{items:products,key:'alle',renderItem,storage});controller.showMore();
 const refreshed=products.map(item=>({...item,name:item.name+' oppdatert'}));let calls=0;
 assert.equal(mountCatalogPagination(view.grid,{items:refreshed,key:'alle',renderItem:item=>{calls++;return renderItem(item);}}),controller);
 assert.equal(calls,48);assert.equal(controller.visibleCount,48);assert.match(view.grid.childNodes[0].markup,/oppdatert/);assert.equal(view.section.childNodes.length,2);
 mountCatalogPagination(view.grid,{items:products,key:'stoler',renderItem});assert.equal(controller.visibleCount,24);
 mountCatalogPagination(view.grid,{items:products,key:'alle',renderItem});assert.equal(controller.visibleCount,24);
});

test('a fresh catalog page restores its loaded range for returning from a product',()=>{
 const storage=memoryStorage(),first=fixture(storage);
 const controller=mountCatalogPagination(first.grid,{items:products,key:'/utvalg.html?kategori=Stoler',renderItem});controller.showMore();
 const returned=fixture(storage);let rendered=0;
 const restored=mountCatalogPagination(returned.grid,{items:products,key:'/utvalg.html?kategori=Stoler',renderItem:item=>{rendered++;return renderItem(item);}});
 assert.equal(restored.visibleCount,48);assert.equal(rendered,48);
 const reduced=fixture(storage);assert.equal(mountCatalogPagination(reduced.grid,{items:products.slice(0,29),key:'/utvalg.html?kategori=Stoler',renderItem}).visibleCount,29);
});

test('small or empty lists need no button, and blocked storage does not prevent browsing',()=>{
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},view=fixture(broken);
 const controller=mountCatalogPagination(view.grid,{items:[],key:'empty',renderItem});
 assert.equal(controller.visibleCount,0);assert.equal(view.controls.hidden,true);assert.equal(view.grid.childNodes.length,0);
 mountCatalogPagination(view.grid,{items:products,key:'all',renderItem});controller.showMore();assert.equal(controller.visibleCount,48);
 mountCatalogPagination(view.grid,{items:products.slice(0,7),key:'filtered',renderItem});assert.equal(controller.visibleCount,7);assert.equal(view.controls.hidden,true);
 controller.destroy();assert.equal(view.section.childNodes.length,1);controller.showMore();assert.equal(controller.visibleCount,7);
 assert.throws(()=>mountCatalogPagination(view.grid,{items:products}),/items og renderItem/);assert.equal(view.section.childNodes.length,1);
});
