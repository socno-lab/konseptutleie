import {photoProfiles} from './module-photo-profiles.js?v=modulephotos1';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=(selection,id)=>Math.min(99,Math.max(0,Math.floor(Number(selection[id])||0)));
// Physical ordering is shared by rental, purchase and saved rental setups.
export function modulePhotoParts(modules,selection){
 const parts=[],bases=modules.filter(p=>p.moduleRole==='base'),ends=modules.filter(p=>p.moduleRole==='end');
 const add=(p,role=p.moduleRole,half='')=>parts.push({product:p,role,half,width:(Number(p.moduleWidth)||80)/(half?2:1)});
 const push=role=>{for(const p of modules.filter(p=>p.moduleRole===role))for(let n=0;n<amount(selection,p.id);n++)add(p);};
 for(const p of bases)for(let n=0;n<amount(selection,p.id);n++)add(p,'left','left');
 push('left');
 for(const p of ends)if(amount(selection,p.id))add(p,'left');
 push('middle');
 for(const p of ends)for(let n=1;n<amount(selection,p.id);n++)add(p,'right');
 push('right');
 for(const p of bases)for(let n=0;n<amount(selection,p.id);n++)add(p,'right','right');
 return parts;
}
function photo(part,x,y,width,height){
 const p=part.product,profile=photoProfiles[p.id],known=profile&&profile.source===p.image;
 const size=known?profile.size:[1,1],crop=known?[...profile.crop]:[0,0,1,1];
 if(part.half){const mid=(crop[0]+crop[2])/2;if(part.half==='left')crop[2]=mid;else crop[0]=mid;}
 const mirror=p.moduleRole==='end'&&part.role==='left';
 const viewport=`${crop[0]} ${crop[1]} ${crop[2]-crop[0]} ${crop[3]-crop[1]}`;
 return `<g data-photo-module="${escape(p.id)}" data-photo-role="${part.role}" transform="translate(${mirror?x+width:x} ${y})${mirror?' scale(-1 1)':''}"><title>${escape(p.name)}</title><svg width="${width}" height="${height}" viewBox="${viewport}" preserveAspectRatio="${known?'none':'xMidYMax meet'}" overflow="hidden"><image href="${escape(p.image)}" width="${size[0]}" height="${size[1]}" preserveAspectRatio="none"/></svg></g>`;
}
export function modulePhotoPreview(modules,selection){
 const parts=modulePhotoParts(modules,selection);
 if(!parts.length)return '<p class="module-photo-empty">Velg moduler for å se oppsettet.</p>';
 // Wrap large orders rather than introducing a horizontal scroll area.
 const leftHalves=parts.filter(p=>p.half==='left'),rightHalves=parts.filter(p=>p.half==='right'),extras=parts.filter(p=>!p.half);
 const runs=leftHalves.length?leftHalves.map((p,i)=>[p,...(i===0?extras:[]),rightHalves[i]]):[parts];
 const rows=[];for(const run of runs)for(let i=0;i<run.length;i+=6)rows.push(run.slice(i,i+6));
 const rowWidths=rows.map(row=>row.reduce((sum,p)=>sum+p.width,0)),width=Math.max(240,...rowWidths),rowHeight=100;
 const images=rows.map((row,i)=>{let x=(width-rowWidths[i])/2;return row.map(part=>{const h=/sjeselong/i.test(part.product.name)?88:78;const result=photo(part,x,i*rowHeight+88-h,part.width,h);x+=part.width;return result;}).join('');}).join('');
 const label='Valgt oppsett: '+modules.filter(p=>amount(selection,p.id)).map(p=>`${amount(selection,p.id)} × ${p.name}`).join(', ');
 return `<figure class="module-photo"><svg viewBox="-8 0 ${width+16} ${rows.length*rowHeight}" role="img" aria-label="${escape(label)}">${images}</svg><figcaption>Illustrasjon av valgt oppsett · satt sammen av produktbilder</figcaption></figure>`;
}
