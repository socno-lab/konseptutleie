import {photoProfiles} from './module-photo-profiles.js?v=launch20261024';
import {joinedPhotoParts} from './module-joined-profiles.js?v=launch20261024';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=(selection,id)=>Math.min(99,Math.max(0,Math.floor(Number(selection[id])||0)));
// Physical ordering is shared by rental, purchase and saved rental setups.
export function modulePhotoParts(modules,selection){
 const parts=[],bases=modules.filter(p=>p.moduleRole==='base'),ends=modules.filter(p=>p.moduleRole==='end');
 const add=(p,role=p.moduleRole,half='')=>parts.push({product:p,role,half,width:(Number(p.moduleWidth)||80)/(half?2:1)});
 const push=role=>{for(const p of modules.filter(p=>p.moduleRole===role))for(let n=0;n<amount(selection,p.id);n++)add(p);};
 for(const p of bases)for(let n=0;n<amount(selection,p.id);n++)add(p,'left','left');
 push('left');
 const universal=[];for(const p of ends)for(let n=0;n<amount(selection,p.id);n++)universal.push(p);
 const leftOccupied=parts.some(p=>p.role==='left'),universalLeft=!leftOccupied?universal.shift():null;
 if(universalLeft)add(universalLeft,'left');
 push('middle');push('chaise');push('right');
 for(const p of universal)add(p,'right');
 for(const p of bases)for(let n=0;n<amount(selection,p.id);n++)add(p,'right','right');
 return parts;
}
function photo(part,x,y,width,height){
 const p=part.product,custom=p.builderImage?{source:p.builderImage,size:[100,100],crop:p.builderCrop||[0,0,100,100],mirror:p.builderMirror}:null,profile=custom||part.photo||photoProfiles[p.id],source=custom?.source||part.photo?.source||p.image,known=profile&&(profile.source===source||profile.aliases?.includes(source));
 const size=known?profile.size:[1,1],crop=known?[...profile.crop]:[0,0,1,1];
 if(part.half&&!part.photo){const mid=(crop[0]+crop[2])/2;if(part.half==='left')crop[2]=mid;else crop[0]=mid;}
 const mirror=custom?.mirror??part.photo?.mirror??(!part.photo&&p.moduleRole==='end'&&part.role==='left');
 const viewport=`${crop[0]} ${crop[1]} ${crop[2]-crop[0]} ${crop[3]-crop[1]}`;
 return `<g data-photo-module="${escape(p.id)}" data-photo-role="${part.role}" transform="translate(${mirror?x+width:x} ${y})${mirror?' scale(-1 1)':''}"><title>${escape(p.name)}</title><svg style="width:${width+.15}px;height:${height}px" width="${width+.15}" height="${height}" viewBox="${viewport}" preserveAspectRatio="${known?'none':'xMidYMax meet'}" overflow="hidden"><image href="${escape(source)}" width="${size[0]}" height="${size[1]}" preserveAspectRatio="none"/></svg></g>`;
}
function previewZoom(){return '<button type="button" class="module-photo-zoom" data-zoom-target="self" aria-label="Forstørr valgt sofaoppsett"><span aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 5.5 5.5M10 6.5v7M6.5 10h7"/></svg></span></button>';}
export function modulePhotoPreview(modules,selection){
 const parts=modulePhotoParts(modules,selection);
 if(!parts.length)return '<p class="module-photo-empty">Velg moduler for å se oppsettet.</p>';
 const label='Valgt oppsett: '+modules.filter(p=>amount(selection,p.id)).map(p=>`${amount(selection,p.id)} × ${p.name}`).join(', ');
 const beigeEnd=modules.find(p=>p.id==='obj_371e3a52807c452ea1280dafd434b7e4'),beigeMiddle=modules.find(p=>p.id==='obj_d9314111959a42bf8b7ca3015af09003');
 const beige=!modules.some(p=>p.builderImage)&&beigeEnd&&beigeMiddle&&beigeEnd.image==='/assets/beige-endemodul.webp'&&beigeMiddle.image==='/assets/beige-midtmodul.webp';
 const ends=beige?amount(selection,beigeEnd.id):0,middles=beige?amount(selection,beigeMiddle.id):0;
 // Use the exact assembled supplier photographs for the matching beige setups.
 if(beige&&ends===2&&middles<=1){const src=middles?'/assets/beige-sofa-tre-moduler.webp':'/assets/beige-sofa-to-moduler.webp';return `<figure class="module-photo"><img data-complete-sofa="true" src="${src}" alt="${escape(label)}"><figcaption>Valgt oppsett · produktbilde</figcaption>${previewZoom()}</figure>`;}
 let generated=parts.length>1&&joinedPhotoParts(parts);
 if(beige&&parts.length>1){
  generated=true;
  // All tiles come from one coherent frontal scene, sharing camera and seat height.
  for(const part of parts){const crop=part.role==='left'?[8,64,800,612]:part.role==='right'?[1376,64,2162,612]:[800,64,1376,612];part.photo={source:'/assets/beige-sofa-front-connected-v2.png',size:[2170,725],crop};}
 }
 const base=modules.find(p=>p.moduleRole==='base'&&amount(selection,p.id)===1),baseProfile=base&&photoProfiles[base.id];
 if(base&&(baseProfile?.source===base.image||baseProfile?.aliases?.includes(base.image))&&/Senzo/i.test(base.moduleSeries||'')){
  const [x1,y1,x2,y2]=baseProfile.crop,span=x2-x1,mid=(x1+x2)/2;
  for(const part of parts){const crop=part.role==='left'?[x1,y1,mid,y2]:part.role==='right'?[mid,y1,x2,y2]:[x1+span*.2475,y1,x1+span*.63,y2];part.photo={...baseProfile,crop};}
 }

 // Wrap large orders rather than introducing a horizontal scroll area.
 const leftHalves=parts.filter(p=>p.half==='left'),rightHalves=parts.filter(p=>p.half==='right'),extras=parts.filter(p=>!p.half);
 const runs=leftHalves.length?leftHalves.map((p,i)=>[p,...(i===0?extras:[]),rightHalves[i]]):[parts];
 const rows=[];for(const run of runs){if(generated||run.some(p=>['left','right'].includes(p.role)))rows.push(run);else for(let i=0;i<run.length;i+=6)rows.push(run.slice(i,i+6));}
 const rowWidths=rows.map(row=>row.reduce((sum,p)=>sum+p.width,0)),width=Math.max(generated?120:240,...rowWidths),rowHeight=parts.some(p=>p.photo?.tall)?110:100;
 const images=rows.map((row,i)=>{let x=(width-rowWidths[i])/2;return row.map(part=>{const h=part.photo?.height||(/sjeselong/i.test(part.product.name)?88:78),y=part.photo?.top??(part.product.moduleRole==='chaise'?10:88-h);const result=photo(part,x,i*rowHeight+y,part.width,h);x+=part.width;return result;}).join('');}).join('');
 return `<figure class="module-photo" data-generated="${generated}"><svg viewBox="-8 0 ${width+16} ${rows.length*rowHeight}" role="img" aria-label="${escape(label)}">${images}</svg><figcaption>${generated?'KI-generert illustrasjon av valgt oppsett':'Illustrasjon av valgt oppsett · satt sammen av produktbilder'}</figcaption>${previewZoom()}</figure>`;
}
