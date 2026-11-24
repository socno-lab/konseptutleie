import PDFDocument from 'pdfkit';
import {demand} from '../public/catalog-model.js';
import {workflowTransport} from '../public/admin/transport-model.js';

export function warehouseItems(lines, products) {
 const catalog = new Map(products.map(p => [p.id, p]));
 const items = [];
 for (const line of lines) {
  const parent = catalog.get(line.id);
  for (const part of demand(parent, line.quantity)) {
   const p = catalog.get(part.id);
   if (!p) throw new Error('Pakkeinnhold mangler for ' + parent.name);
   const kit = /tekstilpakke|dekorpakke|sengeoppredning/i.test(p.name) || p.wallGroup;
   const context = [parent.isPackage && parent.name, p.moduleSeries].filter(Boolean).join(' / ');
   const roles = p.moduleRole === 'base' ? ['Venstre modul', 'Høyre modul'] : [''];
   for (const role of roles) items.push({
    name: [p.name, role].filter(Boolean).join(' · '), context, quantity: part.quantity,
    image: p.image || line.image, physical: !p.isService || Boolean(kit)
   });
  }
 }
 return items;
}

const date = s => s?.split('-').reverse().join('.') || 'Ikke avtalt';
const ink = '#30372b';
function pagePDF(draw) {
 return new Promise((resolve,reject) => {
  const doc = new PDFDocument({size:'A4', margin:42, autoFirstPage:false});
  const chunks = [];
  doc.on('data', c => chunks.push(c)).on('error',reject).on('end',()=>resolve(Buffer.concat(chunks)));
  draw(doc);
  doc.end();
 });
}

export async function warehouseMessage(s, images = new Map()) {
 const r = s.workflow, w = s.warehouse;
 const customer = [w.company,w.name].filter(Boolean).join(' · ') || r.email;
 const period = date(r.deliveryDate) + ' – ' + date(r.pickupDate);
 const version = 'Versjon ' + s.version + (s.version > 1 ? ' · Oppdatert – erstatter tidligere versjon' : '');
 const transport = workflowTransport(r).dateLine;
 function heading(doc,title) {
  doc.addPage().fillColor(ink).font('Helvetica').fontSize(12).text('KONSEPTUELL   /   LAGER');
  doc.moveDown().font('Helvetica-Bold').fontSize(30).text(title);
  doc.font('Helvetica').fontSize(11).text(version).moveDown();
  doc.fontSize(15).text(customer).fontSize(10).text('Ordre ' + r.id).moveDown();
 }
 const embedded=new WeakMap();
 function photo(doc,item,x,y,size) {
  const image = images.get(item.image);
  if (!image) return;
  if (!embedded.has(doc)) embedded.set(doc,new Map());
  const cache=embedded.get(doc);
  if (!cache.has(image)) cache.set(image,doc.openImage(image));
  doc.image(cache.get(image),x,y,{fit:[size,size],align:'center',valign:'center'});
 }
 const list = await pagePDF(doc => {
  heading(doc,'Plukkliste');
  doc.fontSize(12).text('Leieperiode   ' + date(r.start) + ' – ' + date(r.end)).text(transport);
  let y = doc.y + 18;
  for (const item of w.items) {
   const name = item.quantity + ' × ' + item.name;
   doc.font('Helvetica-Bold').fontSize(14);
   const nameHeight = doc.heightOfString(name,{width:420});
   doc.font('Helvetica').fontSize(11);
   const height = Math.max(76, nameHeight + doc.heightOfString(item.context,{width:420}) + 38);
   if (y + height > 790) { heading(doc,'Plukkliste'); y = doc.y + 12; }
   photo(doc,item,42,y,60);
   doc.font('Helvetica-Bold').fontSize(14).text(name,120,y,{width:420});
   doc.font('Helvetica').fontSize(11);
   if (item.context) doc.text(item.context,120,doc.y,{width:420});
   const checkY = doc.y + 8;
   for (const [i,label] of ['Plukket','Utlevert','Returnert'].entries()) {
    const x = 120 + i*110;
    doc.rect(x,checkY,10,10).stroke().text(label,x+15,checkY,{lineBreak:false});
   }
   y += height;
   doc.moveTo(42,y-7).lineTo(552,y-7).strokeColor('#bfc4bb').stroke().strokeColor(ink);
  }
 });
 const attachments = [{filename:'Plukkliste.pdf',content:list,contentType:'application/pdf'}];
 const physical = w.items.filter(i=>i.physical);
 if (physical.length) {
  const labels = await pagePDF(doc => {
   for (const item of physical) for (let n=1;n<=item.quantity;n++) {
    heading(doc,'RESERVERT');
    doc.font('Helvetica-Bold').fontSize(23).text(period).moveDown();
    doc.fontSize(26).text(item.name);
    doc.font('Helvetica').fontSize(15);
    if (item.context) doc.text(item.context);
    doc.moveDown().text('Enhet ' + n + ' av ' + item.quantity).moveDown().fontSize(13).text(transport);
    photo(doc,item,175,Math.max(doc.y+12,400),240);
   }
  });
  attachments.push({filename:'Reservasjonsark.pdf',content:labels,contentType:'application/pdf'});
 }
 return {subject:'Plukkliste · ' + r.id + ' · v' + s.version,text:customer + '\n' + transport + '\n' + version,attachments};
}
