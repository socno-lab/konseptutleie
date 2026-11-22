// Runs during parsing, before product modules or catalogue initialization.
(()=>{
 const scope=document.getElementById('catalogPricingScope');if(!scope)return;
 const period=document.querySelector('#initialProductOverview [data-product-rental-period]');if(period){try{const draft=JSON.parse(sessionStorage.getItem('konsept-enquiry-draft-rent')||'{}');for(const name of ['start','end']){const value=draft[name],button=period.querySelector('[data-period-field="'+name+'"]');if(button&&/^\d{4}-\d{2}-\d{2}$/.test(value||'')){button.textContent=value.split('-').reverse().join('.');button.dataset.selected='true';button.setAttribute('aria-label',(name==='start'?'Fra dato: ':'Til dato: ')+button.textContent);}}if(draft.start&&draft.end&&draft.end>=draft.start)period.querySelector('[data-period-message]').textContent='';}catch{}}
 const params=new URL(location.href).searchParams;let saved='alle',basis=null;
 try{saved=sessionStorage.getItem('konsept-purpose-v1');if(!saved||saved==='alle')saved=localStorage.getItem('konsept-purpose-v1')||'alle';basis=localStorage.getItem('konsept-rental-scope-v1');}catch{}
 let purpose=params.has('bruk')?params.get('bruk'):saved;try{if(purpose==='alle'&&Object.values(JSON.parse(localStorage.getItem('konsept-cart-v1')||'{}')).some(q=>Number(q)>0))purpose=saved;}catch{}if(purpose==='event')purpose='messe';
 if(!['boligsalg','messe','bedrift','fest','jul','produksjon'].includes(purpose))purpose='alle';
 const selected=purpose!=='alle'?(purpose==='boligsalg'?'standard':'messe'):[params.get('prisbruk'),basis].find(x=>x==='standard'||x==='messe');
 const template=document.getElementById('initialScope-'+selected);if(template)scope.replaceChildren(template.content.cloneNode(true));
 const price=document.querySelector('#initialProductOverview [data-product-unit-price]'),priceTemplate=document.getElementById('initialProductPrice-'+selected);if(price&&priceTemplate)price.replaceChildren(priceTemplate.content.cloneNode(true));
 const options=document.querySelector('#initialProductOverview [data-initial-product-options]'),optionsTemplate=document.getElementById('initialProductOptions-'+selected);if(options&&optionsTemplate)options.replaceChildren(optionsTemplate.content.cloneNode(true));
 for(const key of ['standard','messe'])document.getElementById('initialProductOptions-'+key)?.remove();
 for(const key of ['standard','messe'])document.getElementById('initialScope-'+key)?.remove();
 for(const key of ['standard','messe'])document.getElementById('initialProductPrice-'+key)?.remove();
})();
