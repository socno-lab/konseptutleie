import {getSiteSettings} from './site-settings.js';
import {splitAcquisitionBasket} from './business-purchase-model.js';

// These are the revisions displayed by customer-info.js, shared with the server.
export const PURCHASE_TERMS_REVISION='2026-10-22-2';
export const RENTAL_TERMS_REVISION='2026-10-22-leie-9';
export function getTermsVersions(delivery=getSiteSettings().delivery){
 const tariffRevision=[...JSON.stringify(delivery)].reduce((hash,char)=>((hash*31+char.charCodeAt(0))>>>0),0).toString(36);
 return {rental:RENTAL_TERMS_REVISION+'-'+tariffRevision,purchase:PURCHASE_TERMS_REVISION};
}
export function requiredEnquiryTerms(input,products,versions=getTermsVersions()){
 const choices=input.businessChoices&&typeof input.businessChoices==='object'&&!Array.isArray(input.businessChoices)?input.businessChoices:{};
 const split=splitAcquisitionBasket(input.basket||{},choices,products,input.cartLinks||{},input.packageGroups||[]);
 const rental=input.kind==='rental'&&(input.customRequest===true||Object.keys(split.rental).length>0);
 const purchase=input.kind==='purchase'||input.kind==='rental'&&Object.keys(split.purchase).length>0;
 return [rental?versions.rental:'',purchase?versions.purchase:''].filter(Boolean);
}
export function validateEnquiryTerms(input,products,versions=getTermsVersions()){
 const expected=requiredEnquiryTerms(input,products,versions),actual=typeof input.terms==='string'?input.terms.split(' | '):[];
 if(!expected.length||actual.length!==expected.length||actual.some((version,index)=>version!==expected[index]))
  throw Object.assign(Error('Vilkårene er endret eller ikke godkjent. Last inn siden på nytt og godta gjeldende vilkår før innsending.'),{status:400});
 return expected.join(' | ');
}
