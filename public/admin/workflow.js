const $=id=>document.getElementById(id);
export function mountWorkflow(){
 const form=$('objectForm'),original=[...form.children],sections={};
 const nav=document.createElement('nav');nav.className='workflow-nav';nav.setAttribute('aria-label','Deler av produkteditoren');
 for(const [key,title,icon] of [['basic','Grunninfo og bilder','▧'],['prices','Priser og leieperioder','◇'],['stock','Beholdning og synlighet','▤'],['variants','Varianter','◫'],['package','Pakkeinnhold','▦'],['advanced','Avansert','⚙']]){
   const box=document.createElement('section'),button=document.createElement('button');
   box.className='workflow-section';box.id='editor-'+key;box.setAttribute('aria-label',title);
   button.type='button';button.dataset.panel=key;button.setAttribute('aria-controls',box.id);
   const symbol=document.createElement('span');symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');
   button.append(symbol,' '+title);button.onclick=()=>selectPanel(key);
   nav.append(button);sections[key]=box;
 }
 $('editorNote').after(nav,...Object.values(sections));
 const move=(node,key)=>{if(!node)return;const hint=node.nextElementSibling?.matches('p.hint')?node.nextElementSibling:null;sections[key].append(node);if(hint)sections[key].append(hint);};
 const label=(id,key)=>move($(id)?.closest('label'),key);
 for(const id of ['productKind','objectName','objectCategory','objectSubcategory','objectBrand','objectArticleNumber','objectMaterial'])label(id,'basic');
 move($('dimensionFields'),'basic');label('objectDescription','basic');
 move(document.querySelector('.product-images'),'basic');move(document.querySelector('.purpose-admin'),'basic');
 move($('rentalPricingFields'),'prices');
 const priceFields=$('rentalPricingFields'),preview=$('rentalPricingPreview');
 priceFields.insertBefore($('purchaseUnitFields'),preview);
 for(const id of ['objectPrice','objectWeekPrice','objectMonthPrice','objectPriceOnRequest'])priceFields.insertBefore($(id).closest('label'),preview);
 for(const id of ['saleFields','businessPurchaseFields','buyoutUnitFields'])move($(id),'prices');label('objectDeliveryIncluded','prices');
 for(const id of ['serviceChoice','stockFields','rentalStatusFields'])move($(id),'stock');label('objectActive','stock');label('objectIsExample','stock');
 for(const id of ['serviceFields','moduleFields','variantFields','wallFields'])move($(id),'variants');
 const group=document.createElement('div');group.id='workflowGroup';sections.variants.prepend(group);
 for(const id of ['packageCartFields','packageFields'])move($(id),'package');
 const basics=document.createElement('div');basics.className='basic-fields';
 const images=sections.basic.querySelector('.product-images');basics.append(...sections.basic.children);sections.basic.append(basics,images);
 for(const node of original){if(node.parentElement!==form||node.matches('.editor-heading,.editor-actions,#editorNote,#saveStatus'))continue;if(node.matches('.two')&&!node.children.length){node.remove();continue;}move(node,'advanced');}
 const components=$('componentList'),tools=document.createElement('div');tools.innerHTML='<p id="packageCapacity" role="status"></p><h3>Valgt innhold</h3><div id="componentSelected"></div><details><summary>Legg til produkter i pakken</summary><label>Finn produkt til pakken<input type="search" id="componentSearch" placeholder="Navn eller kategori"></label><div id="componentChoices"></div></details>';
 components.before(tools);components.hidden=true;
 // Filter controls never change product data or the unsaved marker.
 $('componentSearch').addEventListener('input',event=>{event.stopPropagation();filterComponents();});
 form.addEventListener('change',event=>{if(event.target.matches('[data-component]'))queueMicrotask(filterComponents);});
}
export function filterComponents(){
 const q=$('componentSearch').value.toLocaleLowerCase('nb');
 for(const row of [...document.querySelectorAll('.component-row')].filter(row=>row.querySelector('[data-component]'))){const chosen=row.querySelector('[data-component]').checked;row.hidden=!chosen&&!row.textContent.toLocaleLowerCase('nb').includes(q);$(chosen?'componentSelected':'componentChoices').append(row);}
}
export function refreshWorkflow(p,products,{edit,rates,escape}){
 filterComponents();
 const name=p.serviceGroup||p.variantGroup||p.moduleSeries||p.wallGroup;
 const key=p.serviceGroup?'serviceGroup':p.variantGroup?'variantGroup':p.moduleSeries?'moduleSeries':'wallGroup';
 const members=name?products.filter(x=>!x.deletedAt&&x[key]===name):[];
 $('workflowGroup').innerHTML=members.length?'<h3>'+escape(name)+' – oversikt</h3><div class="workflow-table-wrap"><table class="workflow-table"><thead><tr><th>Variant</th><th>Leiepris</th><th>Kjøpspris</th><th>Beholdning</th><th>Visning</th><th></th></tr></thead><tbody>'+members.map(x=>'<tr><td>'+(x.image?'<img src="'+escape(x.image)+'" alt="">':'')+escape(x.name)+'</td><td>'+escape(rates(x).priceOnRequest?'Avklares':rates(x).price.toLocaleString('nb-NO')+' kr'+(x.rentalPricingMode==='fixed'?' / oppdrag':x.rentalPricingMode==='period'?' / 30 dager':' / døgn'))+'</td><td>'+escape(x.saleEnabled?(x.salePrice??x.purchaseUnitPrice??'Avklares')+' kr':'–')+'</td><td>'+escape(x.isService?'Avklares':Math.max(0,(x.stock||0)-(x.unavailable||0))+' stk.')+'</td><td>'+escape((x.active?'Synlig':'Skjult')+(x.rentalEnabled!==false?' · leie':'')+(x.saleEnabled?' · kjøp':''))+'</td><td><button type="button" data-group-edit="'+escape(x.id)+'" '+(x.id===p.id?'disabled':'')+'>Rediger</button></td></tr>').join('')+'</tbody></table></div><p class="hint">Pris, bilder og beholdning lagres per variant. Bytt med Rediger.</p>':'';
 for(const button of $('workflowGroup').querySelectorAll('[data-group-edit]'))button.onclick=()=>edit(products.find(x=>x.id===button.dataset.groupEdit));
}
export function packageCapacity(products){
 const lines=[...document.querySelectorAll('[data-component]:checked')].map(input=>{const p=products.find(x=>x.id===input.dataset.component),quantity=Number(document.querySelector('[data-count="'+input.dataset.component+'"]').value);return {p,quantity};});
 const fixed=lines.filter(x=>x.p&&!x.p.isService&&x.quantity>0),capacity=fixed.length?Math.min(...fixed.map(x=>Math.floor(Math.max(0,x.p.stock-x.p.unavailable)/x.quantity))):null;
 $('packageCapacity').textContent=lines.length+' produkter valgt'+(capacity===null?' · beholdning avklares':` · inntil ${capacity} komplette pakker ut fra registrert beholdning. Begrenset av: `+fixed.filter(x=>Math.floor(Math.max(0,x.p.stock-x.p.unavailable)/x.quantity)===capacity).map(x=>x.p.name).join(', '))+(lines.some(x=>x.p&&(!x.p.active||x.p.rentalEnabled===false))?' OBS: Pakken inneholder skjulte produkter eller produkter uten leie':'')+'. Dette er ikke en reservasjonssjekk for valgte datoer.';
}

export function selectPanel(key){
 for(const button of document.querySelectorAll('.workflow-nav [data-panel]')){
   const active=button.dataset.panel===key;
   button.setAttribute('aria-pressed',String(active));
   $(button.getAttribute('aria-controls')).hidden=!active;
 }
}
export function syncPanels(kind){
 const buttons=[...document.querySelectorAll('.workflow-nav [data-panel]')];
 for(const button of buttons){
   button.hidden=(button.dataset.panel==='package'&&kind!=='package')||
     (button.dataset.panel==='variants'&&!['module','product','service','wall'].includes(kind));
 }
 const current=buttons.find(button=>button.getAttribute('aria-pressed')==='true'&&!button.hidden);
 selectPanel(current?.dataset.panel||'basic');
}
