import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readHtmlTemplate} from './html-templates.mjs';
import {pageModel,renderSeo} from './seo.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fingerprint=value=>createHash('sha256').update(value).digest('hex');
function hero(html){const match=html.match(/<section class="hero">[\s\S]*?<\/section>/);if(!match)throw Error('Forsidens hero mangler.');return match[0];}
export async function designSources(){const [home,css,commerce,app,shop]=await Promise.all([readFile(path.join(root,'public/index.html'),'utf8').catch(error=>{if(error.code!=='ENOENT')throw error;return readHtmlTemplate('index.html');}),readFile(path.join(root,'public/style.css'),'utf8'),readFile(path.join(root,'public/commerce.css'),'utf8'),readFile(path.join(root,'public/app.js'),'utf8'),readFile(path.join(root,'public/shop.js'),'utf8')]);return {home,css,commerce,app,shop};}
export function designFingerprints(source){const homeRenderer=source.app.match(/function renderRentalHome\(\)\{[^\n]+/);if(!homeRenderer)throw Error('Forsidens kortrenderer mangler.');return {
 'shared-styles':fingerprint(source.css),
 'commerce-styles':fingerprint(source.commerce),
 'home-hero':fingerprint(hero(source.home)),
 'rendered-home-hero':fingerprint(hero(renderSeo(source.home,pageModel('/',new URLSearchParams(),[]),[],true))),
 'home-card-renderer':fingerprint(homeRenderer[0]),
 'rental-image-markup':fingerprint((source.app.match(/<img\b[^>]*>/g)||[]).join('\n')),
 'purchase-image-markup':fingerprint((source.shop.match(/<img\b[^>]*>/g)||[]).join('\n'))
};}
export function verifyDesign(source,baseline){const current=designFingerprints(source);const changed=Object.keys(current).filter(key=>current[key]!==baseline.fingerprints[key]);if(changed.length)throw Error('DESIGNLÅS: Godkjent uttrykk kan være endret ('+changed.join(', ')+'). Se AGENTS.md. Sammenlign mobil og desktop med referansebildene før en bevisst oppdatering. Referansen skal aldri oppdateres automatisk.');return current;}
export async function assertDesignLock(){const baseline=JSON.parse(await readFile(path.join(root,'reference/home-design-lock.json'),'utf8'));verifyDesign(await designSources(),baseline);}
