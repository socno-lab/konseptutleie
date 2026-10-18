import {kiDisclosure,isKiPhoto} from './image-provenance.js?v=ki1';
const viewer=document.createElement('dialog');
viewer.id='imageViewer';viewer.className='image-viewer';viewer.setAttribute('aria-labelledby','imageViewerTitle');
viewer.innerHTML='<div class="image-viewer-header"><h2 id="imageViewerTitle">Bildevisning</h2><button type="button" class="image-viewer-close" aria-label="Lukk bildevisning">✕</button></div><img class="image-viewer-image" alt=""><p class="image-viewer-notice" hidden></p><div class="image-viewer-controls"><button type="button" class="image-viewer-prev" aria-label="Forrige bilde">← Forrige</button><p role="status" class="image-viewer-count"></p><button type="button" class="image-viewer-next" aria-label="Neste bilde">Neste →</button></div>';
document.body.append(viewer);
const photo=viewer.querySelector('img'),count=viewer.querySelector('.image-viewer-count'),previous=viewer.querySelector('.image-viewer-prev'),next=viewer.querySelector('.image-viewer-next');
let photos=[],index=0;
function paint(){const current=photos[index];photo.src=current.src;photo.alt=current.alt||'Produktbilde i stor størrelse';const notice=viewer.querySelector('.image-viewer-notice');notice.hidden=!isKiPhoto(current.src);notice.textContent=kiDisclosure;count.textContent=(index+1)+' av '+photos.length;previous.disabled=next.disabled=photos.length<2;}
function step(delta){index=(index+delta+photos.length)%photos.length;paint();}
previous.onclick=()=>step(-1);next.onclick=()=>step(1);viewer.querySelector('.image-viewer-close').onclick=()=>viewer.close();
viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.close();});
viewer.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(event.key==='ArrowRight'?1:-1);}});
viewer.addEventListener('close',()=>{photo.removeAttribute('src');});
document.addEventListener('click',event=>{
 const trigger=event.target.closest('[data-zoom]');if(!trigger)return;
 const src=trigger.dataset.productPhoto||trigger.querySelector('img')?.getAttribute('src')||trigger.dataset.zoom;if(!src)return;
 const group=trigger.closest('#productImages, #detailContent, #wallCoverPreview')||trigger;
 const seen=new Set();photos=[...group.querySelectorAll('[data-zoom], [data-product-photo]')].map(button=>({src:button.dataset.productPhoto||button.dataset.zoom,alt:button.querySelector('img')?.alt||group.querySelector('h2')?.textContent||'Produktbilde'})).filter(item=>item.src&&!seen.has(item.src)&&seen.add(item.src));
 if(!photos.some(item=>item.src===src))photos.push({src,alt:trigger.querySelector('img')?.alt||'Produktbilde'});
 index=photos.findIndex(item=>item.src===src);paint();if(!viewer.open)viewer.showModal();
});
