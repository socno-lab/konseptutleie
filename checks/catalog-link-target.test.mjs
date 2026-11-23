import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogLinkTarget} from '../public/catalog-link-target.js';
test('New ordinary products without module fields cannot capture wall or module links',()=>{
 const products=[{id:'new-chair'},{id:'wall',wallGroup:'Bildevegg',moduleSeries:''},{id:'sofa',moduleSeries:'Modulsofa'}];
 for(const key of ['product','detail','rentalColour'])for(const p of products)assert.equal(catalogLinkTarget({[key]:p.id},products),p.id);
 assert.equal(catalogLinkTarget({wall:'Bildevegg'},products),'wall');
 assert.equal(catalogLinkTarget({build:'Modulsofa'},products),'sofa');
 for(const data of [{},{wall:'missing'},{build:'missing'},{detail:'missing'}])assert.equal(catalogLinkTarget(data,products),null);
});
