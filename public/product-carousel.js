// Shared image navigation; vertical gestures always remain with the product dialog.
const mounted=new WeakSet();
function mount(root){
 if(!root)return;
 const sale=root.id==='saleDetailContent',intro=root.querySelector(sale?'.sale-product-intro':'.product-intro');
 let stage=intro?.querySelector(sale?'.sale-image-stage':'.product-art');
 if(!stage||mounted.has(stage))return;
 mounted.add(stage);
 if(!sale){const wrapper=document.createElement('div');wrapper.className='product-image-stage';stage.before(wrapper);wrapper.append(stage);stage=wrapper;}
 const choices=[...root.querySelectorAll(sale?'[data-photo]':'[data-product-photo]')];
 if(choices.length<2)return;
 const controls=document.createElement('div');controls.className='product-image-controls';controls.setAttribute('role','group');controls.setAttribute('aria-label','Bla mellom produktbilder');
 controls.innerHTML='<button type="button" aria-label="Forrige produktbilde"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><span class="product-image-count" aria-live="polite"></span><button type="button" aria-label="Neste produktbilde"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>';
 stage.append(controls);
 const current=()=>{if(sale&&root.querySelector('#saleModulePreview:not([hidden])'))return -1;const src=stage.querySelector(sale?'#saleDetailPhoto':'img')?.getAttribute('src');return choices.findIndex(b=>(b.dataset.photo||b.dataset.productPhoto)===src);};
 const paint=()=>{const i=current(),label=i<0?'Valgt oppsett':`${i+1} / ${choices.length}`;const count=controls.querySelector('span');if(count.textContent!==label)count.textContent=label;};
 const step=delta=>{const i=current();choices[i<0?(delta>0?0:choices.length-1):(i+delta+choices.length)%choices.length].click();paint();};
 controls.querySelector('button:first-child').onclick=()=>step(-1);controls.querySelector('button:last-child').onclick=()=>step(1);
 let start=null,swiped=false;
 stage.addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;swiped=false;},{passive:true});
 stage.addEventListener('touchend',e=>{if(!start||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){swiped=true;step(dx<0?1:-1);}},{passive:true});
 stage.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 stage.addEventListener('click',e=>{if(swiped){e.preventDefault();e.stopPropagation();swiped=false;}},true);
 new MutationObserver(paint).observe(stage,{subtree:true,attributes:true,attributeFilter:['src','hidden']});paint();
}
function scan(){mount(document.getElementById('detailContent'));mount(document.getElementById('saleDetailContent'));}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();
