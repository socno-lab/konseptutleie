// Runs during parsing, before product modules or catalogue initialization.
(()=>{
 const scope=document.getElementById('catalogPricingScope');if(!scope)return;
 const period=document.querySelector('#initialProductOverview [data-product-rental-period]');if(period){try{const draft=JSON.parse(sessionStorage.getItem('konsept-enquiry-draft-rent')||'{}');for(const name of ['start','end']){const value=draft[name],button=period.querySelector('[data-period-field="'+name+'"]');if(button&&/^\d{4}-\d{2}-\d{2}$/.test(value||'')){button.textContent=value.split('-').reverse().join('.');button.dataset.selected='true';button.setAttribute('aria-label',(name==='start'?'Fra dato: ':'Til dato: ')+button.textContent);}}if(draft.start&&draft.end&&draft.end>=draft.start)period.querySelector('[data-period-message]').textContent='';}catch{}}
 const params=new URL(location.href).searchParams;let saved='alle',basis=null;
 try{saved=sessionStorage.getItem('konsept-purpose-v1')||'alle';basis=localStorage.getItem('konsept-rental-scope-v1');}catch{}
 let purpose=params.has('bruk')?params.get('bruk'):saved;if(purpose==='event')purpose='messe';
 if(!['boligsalg','messe','bedrift','fest','jul'].includes(purpose))purpose='alle';
 const selected=purpose!=='alle'?(purpose==='boligsalg'?'standard':'messe'):[params.get('prisbruk'),basis].find(x=>x==='standard'||x==='messe');
 const template=document.getElementById('initialScope-'+selected);if(template)scope.replaceChildren(template.content.cloneNode(true));
 const price=document.querySelector('#initialProductOverview [data-product-unit-price]'),priceTemplate=document.getElementById('initialProductPrice-'+selected);if(price&&priceTemplate)price.replaceChildren(priceTemplate.content.cloneNode(true));
 for(const key of ['standard','messe'])document.getElementById('initialScope-'+key)?.remove();
 for(const key of ['standard','messe'])document.getElementById('initialProductPrice-'+key)?.remove();
})();
