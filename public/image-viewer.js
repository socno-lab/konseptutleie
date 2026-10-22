import './product-carousel.js?v=productdensity1';
import {kiDisclosure,isKiPhoto} from './image-provenance.js?v=admincontrol20261022';
const viewer=document.createElement('dialog');
viewer.id='imageViewer';viewer.className='image-viewer';viewer.setAttribute('aria-labelledby','imageViewerTitle');
viewer.innerHTML='<div class="image-viewer-header"><h2 id="imageViewerTitle">Bildevisning</h2><button type="button" class="image-viewer-close" aria-label="Lukk bildevisning">✕</button></div><img class="image-viewer-image" alt=""><div class="image-viewer-graphic" hidden></div><p class="image-viewer-notice" hidden></p><div class="image-viewer-controls"><button type="button" class="image-viewer-prev" aria-label="Forrige bilde">← Forrige</button><p role="status" class="image-viewer-count"></p><button type="button" class="image-viewer-next" aria-label="Neste bilde">Neste →</button></div>';
document.body.append(viewer);
const graphic=viewer.querySelector('.image-viewer-graphic'),photo=viewer.querySelector('img'),count=viewer.querySelector('.image-viewer-count'),previous=viewer.querySelector('.image-viewer-prev'),next=viewer.querySelector('.image-viewer-next');
let photos=[],index=0;
function paint(){const current=photos[index];photo.hidden=!!current.svg;graphic.hidden=!current.svg;graphic.replaceChildren();if(current.svg){const clone=current.svg.cloneNode(true);clone.setAttribute('aria-label',current.alt||'Valgt sofaoppsett');graphic.append(clone);}else{photo.src=current.src;photo.alt=current.alt||'Produktbilde i stor størrelse';}const notice=viewer.querySelector('.image-viewer-notice');notice.hidden=!(current.generated||isKiPhoto(current.src));notice.textContent=kiDisclosure;count.textContent=(index+1)+' av '+photos.length;previous.disabled=next.disabled=photos.length<2;}
function step(delta){index=(index+delta+photos.length)%photos.length;paint();}
previous.onclick=()=>step(-1);next.onclick=()=>step(1);viewer.querySelector('.image-viewer-close').onclick=()=>viewer.close();
viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
viewer.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
viewer.addEventListener('close',()=>{photo.removeAttribute('src');graphic.replaceChildren();});
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-zoom], [data-zoom-target]');if(!trigger)return;
 const target=trigger.dataset.zoomTarget==='self'?trigger.closest('.module-photo'):null;
 const svg=target?.querySelector('svg');
 const src=target?.querySelector('img')?.getAttribute('src')||trigger.dataset.productPhoto||trigger.querySelector('img')?.getAttribute('src')||trigger.dataset.zoom;
 if(!src&&!svg)return;
 const group=trigger.closest('#productImages, #detailContent, #wallCoverPreview, #saleDetailContent, #modules')||trigger;
 const title=group.querySelector('h1,h2')?.textContent||group.closest('dialog')?.querySelector('h1,h2')?.textContent||'Produktbilde';
 const seen=new Set();photos=[...group.querySelectorAll('[data-zoom], [data-product-photo], [data-photo]')].map(button=>({src:button.dataset.productPhoto||button.dataset.zoom||button.dataset.photo,alt:button.querySelector('img')?.alt||title})).filter(item=>item.src&&!seen.has(item.src)&&seen.add(item.src));
 if(svg){photos.unshift({svg:svg.cloneNode(true),alt:svg.getAttribute('aria-label')||title,generated:target.dataset.generated==='true'});index=0;}
 else{if(!photos.some(item=>item.src===src))photos.push({src,alt:target?.querySelector('img')?.alt||trigger.querySelector('img')?.alt||title});index=photos.findIndex(item=>item.src===src);}
 paint();if(!viewer.open)viewer.showModal();
});
