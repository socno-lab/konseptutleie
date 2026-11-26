import {esc,states} from './workspace.js?v=8';

export const reasons={sold:'Solgt',scrapped:'Kassert',lost:'Tapt'};
export function transitionTable(products,items,baselines){
 const byProduct=new Map();
 for(const item of items){
  if(!byProduct.has(item.product))byProduct.set(item.product,[]);
  byProduct.get(item.product).push(item);
 }
 const rows=products.filter(p=>p.rentalStock!==false).map(p=>{
  const units=byProduct.get(p.id)||[],checked=units.filter(i=>i.checkedIn);
  const complete=checked.filter(i=>!i.side).length+Math.min(...['left','right'].map(side=>checked.filter(i=>i.side===side).length));
  const old=p.qrStock?baselines[p.id]:p.stock;
  return '<tr><th>'+esc(p.name)+'</th><td>'+esc(old??'–')+'</td><td>'+units.filter(i=>i.labelPrinted).length+'</td><td>'+checked.length+'</td><td>'+(p.qrStock?'–':Math.max(0,(p.stock||0)-complete))+'</td><td>'+(p.qrStock?'QR-lager':'Manuell')+'</td></tr>';
 });
 return '<h1>Overgang til QR-lager</h1><p>Utskrevet og fysisk bekreftet telles per etikett. Gjenstår telles i katalogens enheter. To matchende endemoduler utgjør én grunnsofa.</p><p>Strek i tidligere beholdning betyr at en historisk verdi ikke er registrert.</p><label>Søk etter produkt<input type="search" id="transitionSearch"></label><div class="usage-table"><table><thead><tr><th>Produkt</th><th>Manuelt antall før overgang</th><th>Utskrevet</th><th>Fysisk bekreftet</th><th>Gjenstår</th><th>Styrer nettsiden</th></tr></thead><tbody id="transitionRows">'+rows.join('')+'</tbody></table></div>';
}
export function countingReport(session,units,button){
 const seen=new Set(session.seen),expected=new Set(session.expected);
 const missing=session.expected.filter(id=>!seen.has(id)),extra=session.seen.filter(id=>!expected.has(id));
 const items=new Map(units.map(i=>[i.id,i]));
 const lines=(label,ids)=>ids.length?'<details><summary>'+label+' · '+ids.length+'</summary><ul>'+ids.map(id=>{
  const i=items.get(id);
  return '<li>'+esc(i?.name||id)+' · '+esc(id)+(i?' · '+esc(states[i.state]||reasons[i.retiredReason]||''):'')+' '+button('Åpne møbel','item',id)+'</li>';
 }).join('')+'</ul></details>':'';
 return '<p><strong>'+ (expected.size-missing.length)+' av '+expected.size+' forventede eksemplarer funnet</strong></p>'+lines('Ikke observert',missing)+lines('Observert utenfor forventet beholdning',extra);
}
