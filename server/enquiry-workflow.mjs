import {defaultTransportDates} from '../public/admin/transport-dates.js';
import {workflowCopy} from '../public/admin/offer-copy.js';
export {workflowCopy} from '../public/admin/offer-copy.js';
import {createHash} from 'node:crypto';
import {rentalDayCount,parseDateOnly} from '../public/rental-dates.js';
import {demand,ratePlan} from '../public/catalog-model.js';
import {rentalRateSets} from '../public/rental-pricing-model.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const clean=(v,max=3000)=>typeof v==='string'?v.trim().slice(0,max):'';
const money=v=>Number.isFinite(v)&&v>=0&&v<=10000000?Math.round(v*100)/100:null;
export function workflowRecord(s){const period=s.facts?.find(f=>f[0]==='Ønsket leieperiode')?.[1]?.split(' til ')||[];return {id:s.id,email:s.email,receivedAt:s.receivedAt,revision:1,status:'new',kind:s.kind,start:period[0]||'',end:period[1]||'',...defaultTransportDates(period[0],period[1]),scope:/Boligfoto/.test(s.facts?.find(f=>f[0]==='Prisgrunnlag')?.[1]||'')?'standard':'messe',intro:'',logistics:'',payment:'Faktura sendes på e-post i forbindelse med levering, med 7 dagers betalingsfrist.',transport:s.delivery?.total??null,discount:s.discount?.discount||0,reserved:false,requirements:[],history:[],lines:(s.lines||[]).filter(l=>l.id!=='custom').map((l,i)=>({key:String(i),id:l.id,name:l.name,image:l.image||'',quantity:l.quantity,total:l.total,originalTotal:l.total,originalQuantity:l.quantity,originalId:l.id,originalName:l.name,review:'pending'}))};}
export function editWorkflow(current,input,products){
 if(current.status==='cancelled')fail('Henvendelsen er avsluttet.',409);const next={...current};
 for(const k of ['start','end','deliveryDate','pickupDate']){next[k]=clean(input[k],10);if(next[k]&&parseDateOnly(next[k])===null)fail('Kontroller datoene.');}
 if(next.start&&next.end&&(!rentalDayCount(next.start,next.end)||rentalDayCount(next.start,next.end)>365))fail('Leieperioden må være 1–365 dager.');
 if(!['standard','messe'].includes(input.scope))fail('Velg prisgrunnlag.');next.scope=input.scope;
 for(const k of ['intro','confirmationIntro','logistics','payment','changeReason'])next[k]=clean(input[k]);next.transport=money(input.transport);next.discount=money(input.discount)||0;
 if(!Array.isArray(input.lines)||!input.lines.length||input.lines.length>150)fail('Velg produkter.');
 next.lines=input.lines.map(l=>{let previous=current.lines.find(x=>x.key===l.key);const p=products.find(p=>p.id===l.id&&p.active&&!p.deletedAt);if(!previous&&p&&/^new-[a-z0-9-]{1,60}$/.test(l.key||''))previous={key:l.key,id:'',originalId:p.id,originalName:p.name};if(!p||!previous||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>99||!['pending','ok','missing','alternative'].includes(l.review))fail('Kontroller produktlinjene.');
 const changed=p.id!==previous.id||l.quantity!==previous.quantity||next.start!==current.start||next.end!==current.end||next.scope!==current.scope;
 const priced={...p,...rentalRateSets(p,products)[next.scope]};const plan=changed&&!priced.priceOnRequest&&rentalDayCount(next.start,next.end)?ratePlan(priced,rentalDayCount(next.start,next.end),products.map(x=>({...x,...rentalRateSets(x,products)[next.scope]}))):null;
 return {...previous,originalTotal:previous.originalTotal??(previous.id===previous.originalId?previous.total:null),originalQuantity:previous.originalQuantity??(previous.id===previous.originalId?previous.quantity:null),id:p.id,name:p.name,image:p.image||'',quantity:l.quantity,review:p.id!==previous.originalId&&l.review==='missing'?'alternative':l.review,originalMissing:p.id!==previous.originalId&&(previous.originalMissing===true||previous.review==='missing'||l.originalMissing===true),total:changed?(plan?money(plan.total*l.quantity):null):money(l.total)};});
 if(new Set(next.lines.map(l=>l.key)).size!==next.lines.length)fail('Dupliserte produktlinjer.');return next;
}
export function reservationRequirements(r,products){
 if(r.kind!=='rental')fail('Reservasjon gjelder leie.');if(!rentalDayCount(r.start,r.end)||rentalDayCount(r.start,r.end)>365||!rentalDayCount(r.deliveryDate,r.pickupDate)||r.deliveryDate>r.start||r.pickupDate<r.end)fail('Levering og henting må omslutte leieperioden.');
 const result={};for(const l of r.lines){const p=products.find(p=>p.id===l.id&&p.active&&!p.deletedAt&&p.rentalEnabled!==false);if(!p)fail('Produktet er ikke tilgjengelig.');for(const d of demand(p,l.quantity)){const item=products.find(p=>p.id===d.id);if(!item)fail('Pakkeinnhold mangler.');if(!item.isService)result[d.id]=(result[d.id]||0)+d.quantity;}}return Object.entries(result).map(([id,quantity])=>({id,quantity}));
}
export function reservedQuantity(records,id,start,end,exclude=''){
 const events=new Map();for(const r of records){if(!r.reserved||r.id===exclude||(r.reservation?.start||r.deliveryDate)>end||(r.reservation?.end||r.pickupDate)<start)continue;const q=r.requirements?.find(x=>x.id===id)?.quantity||0;for(const [day,n]of [[Math.max(Date.parse(start),Date.parse(r.reservation?.start||r.deliveryDate)),q],[Math.min(Date.parse(end),Date.parse(r.reservation?.end||r.pickupDate))+86400000,-q]])events.set(day,(events.get(day)||0)+n);}
 let used=0,peak=0;for(const [,q]of [...events].sort((a,b)=>a[0]-b[0])){used+=q;peak=Math.max(peak,used);}return peak;
}
export function checkReservation(r,products,records){const requirements=reservationRequirements(r,products);for(const d of requirements){const p=products.find(x=>x.id===d.id),free=Math.max(0,p.stock-p.unavailable-reservedQuantity(records,d.id,r.deliveryDate,r.pickupDate,r.id));if(d.quantity>free)fail(`${p.name}: ${free} ledige i perioden, ${d.quantity} ønsket.`,409);}return requirements;}
export function validateSend(r){if(r.lines.some(l=>!['ok','alternative'].includes(l.review)||l.total===null)||r.transport===null)fail('Kontroller produktlinjene og fyll inn priser og transport før sending.');if(!rentalDayCount(r.start,r.end))fail('Velg leieperiode.');if(!rentalDayCount(r.deliveryDate,r.pickupDate)||r.deliveryDate>r.start||r.pickupDate<r.end)fail('Levering og henting må omslutte leieperioden.');if(r.discount>r.lines.reduce((s,l)=>s+l.total,0))fail('Rabatten er større enn leiesummen.');}
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kr=n=>n==null?'Avklares':new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK'}).format(n);
const dt=s=>s?s.split('-').reverse().join('.'):'Ikke avtalt';
export function workflowEmail(s){
 const r=s.workflow,copy=workflowCopy(r),confirmation=s.documentType==='confirmation',title=confirmation?(s.version>1?'Oppdatert ordrebekreftelse':'Ordrebekreftelse'):'Leietilbud';
 if(confirmation)copy.intro=copy.confirmationIntro;
 const rental=r.lines.some(l=>l.total==null)?null:r.lines.reduce((n,l)=>n+l.total,0),sum=rental==null||r.transport==null?null:rental-r.discount+r.transport;
 const alternatives=r.lines.filter(l=>l.originalId&&l.originalId!==l.id);
 const version=s.version>1?`Versjon ${s.version} – erstatter tidligere ${confirmation?'ordrebekreftelse':'tilbud'}.`:'';
 const reservation=confirmation?'Leien er bekreftet i henhold til denne oversikten.':'Produktene reserveres først når vi har mottatt din skriftlige bekreftelse på leien. Frem til dette tar vi forbehold om tilgjengelighet.';
 const closing=confirmation?'Ta gjerne kontakt dersom du har spørsmål om leien.':alternatives.length?`Gi oss gjerne en tilbakemelding på om ${alternatives.length===1?'det alternative produktet':'alternativene'} passer, og om levering og henting på de oppgitte dagene fungerer for deg.`:'Gi oss gjerne en tilbakemelding på om tilbudet og de oppgitte datoene passer. Vi ser frem til å høre fra deg!';
 const text=[`${title} ${dt(r.start)}–${dt(r.end)}`,version,r.changeReason,'Hei!',copy.intro,'Oversikt over produktene',...s.lines.map(l=>`${l.name} · ${l.quantity} stk.${!confirmation&&l.originalId&&l.originalId!==l.id?' · Erstatter '+l.originalName:''}`),'Prisoversikt',`Leie av møbler og interiør: ${kr(rental)}`,`Transport: ${kr(r.transport)}`,`Rabatt: ${kr(r.discount)}`,`Totalt inkl. mva.: ${kr(sum)}`,'Levering og henting',`Levering: ${dt(r.deliveryDate)} · Henting: ${dt(r.pickupDate)}`,copy.logistics,'Reservasjon og betaling',reservation,copy.payment,closing,'Med vennlig hilsen\nAndreas Bygdås\n922 46 713\npost@konseptuell.no\nkonseptuell.no',`Referanse: ${r.id}`].filter(Boolean).join('\n\n');
 const paragraph=v=>v?`<p style="margin:0 0 20px">${e(v).replace(/\n/g,'<br>').replace(/08.00–12.00|7 dagers betalingsfrist|hverdager/g,t=>'<strong>'+t+'</strong>')}</p>`:'';
 const heading=v=>`<h2 style="font:700 19px/1.4 Arial,sans-serif;margin:28px 0 14px;color:#30352b">${v}</h2>`;
 const rows=s.lines.map(l=>`<tr><td style="width:76px;padding:12px;border-bottom:1px solid #e6e3db">${l.image?`<img width="64" style="display:block;width:64px;height:auto;border:1px solid #e6e3db;border-radius:8px" src="${e(l.imageSrc||'https://konseptuell.no'+l.image)}" alt="${e(l.name)}">`:''}</td><td style="padding:12px;border-bottom:1px solid #e6e3db"><strong>${e(l.name)}</strong>${!confirmation&&l.originalId&&l.originalId!==l.id?`<br><span style="color:#6d7366">Erstatter ${e(l.originalName)}.</span>`:''}<br><a style="color:#526047" href="https://konseptuell.no/leieprodukt.html?produkt=${encodeURIComponent(l.id)}">Se produkt</a></td><td style="padding:12px;text-align:right;white-space:nowrap;border-bottom:1px solid #e6e3db">${l.quantity} stk.</td></tr>`).join('');
 const priceRow=(label,value,total=false)=>`<tr><td style="padding:14px 16px;border-bottom:1px solid #e6e3db;${total?'font-weight:bold':''}">${label}</td><td style="padding:14px 16px;text-align:right;border-bottom:1px solid #e6e3db;white-space:nowrap;${total?'font-weight:bold;color:#526047':''}">${e(kr(value))}</td></tr>`;
 const html=`<!doctype html><html lang="nb"><body style="margin:0;padding:20px 8px;font:14px/1.65 Arial,sans-serif;color:#50564b;background:#f4f2eb"><table role="presentation" style="max-width:680px;width:100%;margin:auto;border-collapse:collapse"><tr><td style="padding:0 0 20px;text-align:center"><img src="${s.logoSrc||'https://konseptuell.no/assets/konseptuell-leie-og-kjop-logo.png'}" width="320" alt="Konseptuell" style="width:320px;max-width:85%;height:auto"></td></tr><tr><td style="background:#fff;padding:28px 24px;border-radius:0 0 18px 18px"><h1 style="font:700 26px/1.3 Arial,sans-serif;color:#30352b;margin:0 0 24px">${title} ${dt(r.start)}–${dt(r.end)}</h1>${paragraph(version)}${r.changeReason&&(confirmation||s.version>1)?heading('Endringer i bestillingen')+paragraph(r.changeReason):''}${paragraph('Hei!')}${paragraph(copy.intro)}${heading('Oversikt over produktene')}<table style="width:100%;border-collapse:collapse;border:1px solid #e6e3db"><thead><tr style="background:#f6f4ed;color:#6d7366;font-size:12px;text-align:left"><th style="padding:12px">BILDE</th><th style="padding:12px">PRODUKT</th><th style="padding:12px;text-align:right">ANTALL</th></tr></thead><tbody>${rows}</tbody></table>${heading('Prisoversikt')}<table style="width:100%;border-collapse:collapse;background:#f6f4ed;border-radius:14px">${priceRow('Leie av møbler og interiør',rental)}${priceRow('Transport tur/retur',r.transport)}${r.discount?priceRow('Rabatt',r.discount):''}${priceRow('Totalt inkl. mva.',sum,true)}</table>${heading('Levering og henting')}${paragraph(`Levering: ${dt(r.deliveryDate)} · Henting: ${dt(r.pickupDate)}`)}${paragraph(copy.logistics)}${heading('Reservasjon og betaling')}${paragraph(reservation)}${paragraph(copy.payment)}${paragraph(closing)}<p style="margin:28px 0 12px">Med vennlig hilsen</p><p style="margin:0"><strong style="font-size:19px;color:#30352b">Andreas Bygdås</strong><br>922 46 713<br><a style="color:#526047" href="mailto:post@konseptuell.no">post@konseptuell.no</a><br><a style="color:#526047" href="https://konseptuell.no">konseptuell.no</a></p><p style="font-size:11px;color:#6d7366;margin:28px 0 0;overflow-wrap:anywhere">Referanse: ${e(r.id)}</p></td></tr></table></body></html>`;
 return {subject:`${title} ${dt(r.start)}–${dt(r.end)} · Konseptuell · ${r.id}`,html,text};
}

export const documentDigest=r=>createHash('sha256').update(JSON.stringify({...r,history:[],revision:0,status:'',reserved:false,requirements:[],reservation:null,updatedAt:''})).digest('hex');

export function workflowClosedAt(r){
 if(r.status==='cancelled'){const at=Date.parse(r.closedAt||r.updatedAt||'');return Number.isFinite(at)?at:null;}
 if(r.status!=='confirmed')return null;
 const last=r.history?.filter(h=>h.type==='confirmation').at(-1)?.document?.workflow;
 const end=r.reservation?.end||last?.pickupDate||r.pickupDate||r.end;
 // Start retention after the full return date has passed in Oslo (latest UTC boundary).
 return parseDateOnly(end)!==null?Date.parse(end+'T00:00:00Z')+86400000:null;
}
export const workflowExpired=(r,now)=>{const closed=workflowClosedAt(r);return closed!==null&&now>=closed+30*86400000;};
