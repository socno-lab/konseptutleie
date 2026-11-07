// Keep the complete gallery visible only when it fits below the storefront header.
// Native sticky positioning is bounded by the existing product grid, before alternatives.
const selector='.product-page-media, #modules .module-stage';
const observed=new Set();
let pending=false;
function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
const sizes=new ResizeObserver(schedule);
function update(){
 pending=false;
 const header=document.querySelector('body>header');
 const top=Math.ceil(header?.getBoundingClientRect().height||0)+16;
 const wide=matchMedia('(min-width: 801px)').matches;
 for(const node of [...observed])if(!node.isConnected){sizes.unobserve(node);observed.delete(node);}
 for(const node of document.querySelectorAll('#productPageHost '+selector.split(', ').join(', #productPageHost '))){
  if(!observed.has(node)){observed.add(node);sizes.observe(node);}
  node.style.setProperty('--gallery-sticky-top',top+'px');
  node.classList.toggle('gallery-follows-scroll',wide&&node.getBoundingClientRect().height>0&&node.getBoundingClientRect().height<=innerHeight-top-16);
 }
}
const host=document.getElementById('productPageHost');
if(host){
 new MutationObserver(schedule).observe(host,{childList:true,subtree:true});
 const header=document.querySelector('body>header');if(header)sizes.observe(header);
 addEventListener('resize',schedule);schedule();
}
