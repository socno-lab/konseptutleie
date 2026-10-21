import {recommendProducts,recommendationCandidate,recommendationFamily} from '/recommendation-model.js?v=rentalalternatives1';
import {salesEnabled} from '/sales-model.js';
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountRecommendationEditor(getSelected,getProducts,onChange){
 const configurations=[{mode:'buy',field:'recommendedProducts',root:'productRecommendationFields',prefix:'recommendation',summary:'productRecommendationsSummary',title:'Anbefalinger ved kjøp'},{mode:'rent',field:'rentalAlternatives',root:'rentalAlternativeFields',prefix:'rentalAlternative',summary:'rentalAlternativesSummary',title:'Lignende alternativer ved leie'}];
 const editors=configurations.map(config=>{
 const {mode,field,prefix}=config,root=document.getElementById(config.root),search=document.getElementById(prefix+'Search');
 function render(){const p=getSelected();if(!p)return;const all=getProducts(),ids=p[field]||[],chosen=ids.map(id=>all.find(x=>x.id===id)).filter(Boolean),query=search.value.toLocaleLowerCase('nb');
 document.getElementById(config.summary).textContent=config.title+' · '+(chosen.length?chosen.length+(chosen.length===1?' valgt':' valgte'):'Automatisk');
 document.getElementById(prefix+'Selected').innerHTML=chosen.length?'<ol>'+chosen.map((x,i)=>`<li><span>${html(x.name)}${!x.active?' · Skjult':''}</span><div><button type="button" data-recommendation-up="${i}" aria-label="Flytt ${html(x.name)} opp" ${i===0?'disabled':''}>↑</button><button type="button" data-recommendation-down="${i}" aria-label="Flytt ${html(x.name)} ned" ${i===chosen.length-1?'disabled':''}>↓</button><button type="button" class="text-button" data-recommendation-remove="${x.id}" aria-label="Fjern ${mode==='rent'?'alternativ':'anbefaling'} ${html(x.name)}">Fjern</button></div></li>`).join('')+'</ol>':'<p class="hint">Ingen valgt. Nettsiden foreslår automatisk '+(mode==='rent'?'lignende leieprodukter.':'relevante kjøpsprodukter.')+'</p>';
 const choices=all.filter(x=>!x.deletedAt&&x.id!==p.id&&recommendationCandidate(x)&&!(x.moduleSeries&&['middle','right'].includes(x.moduleRole)&&!x.moduleRequired)&&(mode==='rent'?x.rentalEnabled!==false&&(!x.moduleSeries||x.moduleSeries!==p.moduleSeries):salesEnabled(x)&&recommendationFamily(x)!==recommendationFamily(p))&&(x.name+' '+x.category+' '+x.material).toLocaleLowerCase('nb').includes(query)).sort((a,b)=>Number(ids.includes(b.id))-Number(ids.includes(a.id))||Number(b.category===p.category)-Number(a.category===p.category)||a.name.localeCompare(b.name,'nb'));
 document.getElementById(prefix+'Choices').innerHTML=choices.map(x=>`<label class="relation-choice"><input type="checkbox" data-recommendation-id="${x.id}" ${ids.includes(x.id)?'checked':''} ${ids.length>=4&&!ids.includes(x.id)?'disabled':''}><span><strong>${html(x.name)}</strong><small>${html(x.category)}${mode==='rent'?' · '+Math.max(0,(x.stock||0)-(x.unavailable||0))+' stk. i leiebeholdning':''}${!x.active?' · Skjult':''}</small></span></label>`).join('')||'<p class="hint">Ingen treff.</p>';
 const items=recommendProducts(p,all,mode);document.getElementById(prefix+'Preview').innerHTML='<p>'+(items.map(x=>html(x.moduleSeries||x.name)).join(' · ')||'Ingen tilgjengelige forslag')+'</p>';
 }
 search.oninput=render;
 root.addEventListener('change',e=>{const id=e.target.dataset.recommendationId;if(!id)return;const p=getSelected(),ids=p[field]||[];p[field]=e.target.checked?[...ids,id].slice(0,4):ids.filter(x=>x!==id);render();onChange();});
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=getSelected(),ids=[...(p[field]||[])];if(b.dataset.recommendationRemove)p[field]=ids.filter(id=>id!==b.dataset.recommendationRemove);else{const up=b.dataset.recommendationUp,down=b.dataset.recommendationDown;if(up===undefined&&down===undefined)return;const i=Number(up??down),j=i+(up!==undefined?-1:1);if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];p[field]=ids;}render();onChange();});
 return {render,reset(){search.value='';render();}};
 });
 return {render(){editors.forEach(e=>e.render());},reset(){editors.forEach(e=>e.reset());}};
}
