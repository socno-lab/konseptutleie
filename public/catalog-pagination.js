const catalogues=new WeakMap();
const storagePrefix='konsept-catalog-page:v1:';
let nextCatalogueId=0;

function sessionStorageFor(container){try{return container.ownerDocument.defaultView?.sessionStorage;}catch{return null;}}
function storedCount(storage,key){try{const count=Number(storage?.getItem(storagePrefix+key));return Number.isSafeInteger(count)&&count>0?count:0;}catch{return 0;}}
function rememberCount(storage,key,count){try{storage?.setItem(storagePrefix+key,String(count));}catch{}}

// Reuse the controller when prices or the basket refresh. A new filter starts
// with one batch; only a fresh page restores the last count for its URL/filter.
export function mountCatalogPagination(container,options){
 if(!container)throw new TypeError('Katalogbeholder mangler.');
 if(!Array.isArray(options?.items)||typeof options.renderItem!=='function')throw new TypeError('Katalogen krever items og renderItem.');
 let state=catalogues.get(container);
 if(!state){state=createCatalogue(container,options);catalogues.set(container,state);}
 state.update(options);
 return state.controller;
}

function createCatalogue(container,initialOptions){
 const doc=container.ownerDocument,storage=initialOptions.storage===undefined?sessionStorageFor(container):initialOptions.storage;
 const controls=doc.createElement('div');controls.className='catalog-pagination';
 const status=doc.createElement('p');status.className='hint';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const button=doc.createElement('button');button.type='button';button.className='button button-outline';
 if(!container.id)container.id='catalog-page-list-'+(++nextCatalogueId);
 button.setAttribute('aria-controls',container.id);controls.append(status,button);container.after(controls);
 let items=[],renderItem,key,pageSize=24,visibleCount=0,tailNodes=[],noun='produkter',firstRender=true,destroyed=false;

 function updateControls(){
  status.textContent='Viser '+visibleCount+' av '+items.length+' '+noun;
  const remaining=items.length-visibleCount;
  button.hidden=remaining<=0;button.textContent='Vis '+Math.min(pageSize,remaining)+' flere';
  controls.hidden=items.length<=pageSize;
 }
 function appendCards(from,to){
  const markup=items.slice(from,to).map((item,index)=>renderItem(item,from+index)).join('');
  if(markup)container.insertAdjacentHTML('beforeend',markup);
 }
 function showMore(){
  if(destroyed||visibleCount>=items.length)return;
  for(const node of tailNodes)node.remove();
  const previous=visibleCount;visibleCount=Math.min(items.length,visibleCount+pageSize);
  appendCards(previous,visibleCount);container.append(...tailNodes);
  rememberCount(storage,key,visibleCount);updateControls();
  // When the last batch removes the button, retain a useful keyboard position.
  if(button.hidden){status.tabIndex=-1;status.focus({preventScroll:true});}
 }
 button.addEventListener('click',showMore);
 const controller={showMore,destroy(){if(destroyed)return;destroyed=true;button.removeEventListener('click',showMore);controls.remove();catalogues.delete(container);},get visibleCount(){return visibleCount;},get total(){return items.length;}};
 return {controller,update(options){
  const nextKey=String(options.key??''),requestedSize=Number(options.pageSize??24);
  pageSize=Number.isSafeInteger(requestedSize)&&requestedSize>0?requestedSize:24;
  const desired=firstRender?Math.max(pageSize,storedCount(storage,nextKey)):nextKey===key?Math.max(pageSize,visibleCount):pageSize;
  items=options.items;renderItem=options.renderItem;noun=options.noun||'produkter';key=nextKey;
  visibleCount=Math.min(items.length,desired);firstRender=false;tailNodes=[];
  container.replaceChildren();appendCards(0,visibleCount);
  if(options.tailHtml){const existing=new Set(container.childNodes);container.insertAdjacentHTML('beforeend',options.tailHtml);tailNodes=[...container.childNodes].filter(node=>!existing.has(node));}
  rememberCount(storage,key,visibleCount);updateControls();
 }};
}
