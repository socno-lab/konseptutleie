import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
export async function presentationSources(){
 const files=['public/cart-addons.css','public/service-detail.css','public/cart-thumbnail.js','public/sofa-cart-row.js','public/receipt-layout.js','server/enquiry-email.mjs'];
 const entries=await Promise.all(files.map(async file=>[file,await readFile(new URL(file,root),'utf8')]));
 const ui=await readFile(new URL('public/submission-ui.js',root),'utf8');
 const start=ui.indexOf('export function showEnquiryConfirmation(');
 if(start<0)throw Error('Bekreftelsesvisningen mangler.');
 // The request transport may change independently of the approved presentation.
 entries.push(['confirmation-rendering',ui.slice(start)]);
 return Object.fromEntries(entries);
}
export function presentationFingerprints(sources){return Object.fromEntries(Object.entries(sources).map(([key,value])=>[key,createHash('sha256').update(value).digest('hex')]));}
export function verifyPresentation(sources,baseline){
 const current=presentationFingerprints(sources),keys=new Set([...Object.keys(current),...Object.keys(baseline.fingerprints)]);
 const changed=[...keys].filter(key=>current[key]!==baseline.fingerprints[key]);
 if(changed.length)throw Error('DESIGNLÅS: Godkjent felles presentasjon er endret ('+changed.join(', ')+'). Se DESIGN-STANDARD.md. Kontroller mobil og desktop før en begrunnet, bevisst referanseoppdatering.');
}
export async function assertPresentationLock(){verifyPresentation(await presentationSources(),JSON.parse(await readFile(new URL('reference/presentation-design-lock.json',root),'utf8')));}
