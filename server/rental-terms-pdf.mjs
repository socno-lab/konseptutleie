import PDFDocument from 'pdfkit';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {customerInformationPages} from '../public/customer-information-content.js';
import {getSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {getTermsVersions} from '../public/terms-versions.js?v=purpose20261122';
export function rentalTermsSnapshot(settings=getSiteSettings()){
 const html=customerInformationPages(settings).leiebetingelser[1],version=getTermsVersions(settings.delivery).rental;
 return {version,html,sha256:createHash('sha256').update(html).digest('hex')};
}
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&nbsp;':' '}[c])).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,v)=>String.fromCodePoint(v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v)));
export function rentalTermsBlocks(html){return [...html.matchAll(/<(h2|h3|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(([,tag,content])=>({tag,text:decode(content.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,(_,url,text)=>{const href=url.startsWith('/')?'https://konseptuell.no'+url:url;return /^https?:/.test(href)?`${text} (${href})`:text;}).replace(/<[^>]+>/g,'')).trim()})).filter(b=>b.text);}
export function rentalTermsFilename(terms){return 'Leiebetingelser-Konseptuell-'+terms.version.replace(/[^a-zA-Z0-9-]/g,'')+'.pdf';}
export async function rentalTermsPdf(terms){
 if(!terms?.html||!terms.version)throw Error('Leiebetingelser mangler.');
 const document=new PDFDocument({size:'A4',margins:{top:48,bottom:52,left:48,right:48},bufferPages:true,info:{Title:'Leiebetingelser – Konseptuell',Author:'Konsept Boligstyling AS',Subject:'Versjon '+terms.version}}),chunks=[];
 const complete=new Promise((resolve,reject)=>{document.on('data',chunk=>chunks.push(chunk));document.on('error',reject);document.on('end',()=>resolve(Buffer.concat(chunks)));});
 document.image(fileURLToPath(new URL('../public/assets/konseptuell-leie-og-kjop-logo.png',import.meta.url)),48,40,{width:220});document.y=115;
 document.fillColor('#414b38').font('Helvetica-Bold').fontSize(23).text('Leiebetingelser').moveDown(.5);
 const width=document.page.width-96;
 const blocks=rentalTermsBlocks(terms.html);
 for(const [index,block]of blocks.entries()){
  const heading=block.tag==='h2'||block.tag==='h3',size=block.tag==='h2'?13:block.tag==='h3'?11:10;
  document.font(heading?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(heading?'#414b38':'#30352b');
  let following=0;if(heading&&blocks[index+1]){document.font('Helvetica').fontSize(10);following=document.heightOfString(blocks[index+1].text,{width,lineGap:3,paragraphGap:5})+12;document.font('Helvetica-Bold').fontSize(size);}
  const height=document.heightOfString(block.text,{width,lineGap:3,paragraphGap:5})+(heading?following+10:8);
  if(height<document.page.height-100&&document.y+height>document.page.height-52)document.addPage();
  if(heading)document.moveDown(.45);
  document.text((block.tag==='li'?'• ':'')+block.text,{width,lineGap:3,paragraphGap:5}).moveDown(heading?.45:.55);
 }
 const pages=document.bufferedPageRange();
 for(let i=0;i<pages.count;i++){document.switchToPage(i);const bottom=document.page.margins.bottom;document.page.margins.bottom=0;document.font('Helvetica').fontSize(8).fillColor('#707567').text(`Konseptuell · ${terms.version} · Side ${i+1} av ${pages.count}`,48,document.page.height-34,{width,lineBreak:false});document.page.margins.bottom=bottom;}
 document.end();return complete;
}
