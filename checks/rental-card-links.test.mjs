import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalCardLinks} from '../public/rental-card-links.js';

test('rental first paint already has final card geometry and linked colour, module and wall actions',()=>{
 for(const target of ['data-detail="chair"','data-build="Lys beige"','data-wall="Bildevegg"']){
  const source='<article class="module-card"><button class="product-art" '+target+' aria-label="Se stol"><img src="/chair.jpg"></button><div class="product-meta"><div><h3>Stol &amp; sofa</h3><p>Stoff</p></div><button type="button" class="button dark module-build-button" '+target+'>Velg</button><button class="add" data-detail="chair">Velg til tilbud</button></div><button type="button" class="variant-swatch" data-rental-colour="green" aria-pressed="false"><span>Grønn</span></button></article>';
  const html=rentalCardLinks(source,{id:'chair'},{bruk:'boligsalg',prisbruk:'standard',returnTo:'/utvalg.html?bruk=boligsalg&kategori=Stoler&farge=gronn'});
  assert.match(html,/class="catalog-product-card module-card"/);assert.doesNotMatch(html,/<button/);
  assert.match(html,/<h3><a class="catalog-card-link"[^>]*>Stol &amp; sofa<\/a><\/h3>/);
  assert.equal((html.match(/class="catalog-card-link"/g)||[]).length,1);
  assert.match(html,/data-rental-colour="green"[^>]*href="\/leieprodukt\.html\?produkt=green"/);
  assert.doesNotMatch(html,/retur=|prisbruk=|bruk=/);
  assert.doesNotMatch(html,/aria-pressed|Velg til tilbud|module-build-button/);
 }
});
