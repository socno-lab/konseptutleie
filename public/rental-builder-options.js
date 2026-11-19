import {rentalProductOptions} from './rental-product-options.js?v=choicesfirst20261119';
import {remaining,modulePreset} from './catalog-model.js?v=longrent20261026';
import {requiredModuleQuantity,moduleStartCandidates} from './module-builder-settings.js';
import {moduleQuantityLimit} from './sofa-layout.js?v=launch20261024';
import {sofaConfiguration,withoutSofas} from './sofa-model.js?v=longrent20261026';
import {sofaCardConfiguration} from './sofa-card-model.js?v=longrent20261026';
import {modulePhotoPreview} from './module-photo-preview.js?v=lagoon20261025';
import {rentalStatusBadge,rentalStatusNotice,rentalSeriesRentedOut,isRentedOut} from './rental-status.js?v=rented20261029b';
import {responsiveImageAttributes} from './media-image.js?v=launch20261024';
import {isKiPhoto,kiDisclosure} from './image-provenance.js?v=fest20261114';
import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';
import {packageGroupPeriodTotal} from './package-cart-model.js?v=longrent20261026';
import {productPeriodMarkup} from './product-period-markup.js?v=sitefirst20261106';
import {isWall,wallLabel,frameSketch,presetFrames} from './wall-model.js?v=launch20261024';

export function rentalModuleInitialState(series,products,{cart={},setups=[],editingId=''}={}){
 const saved=setups.find(s=>s.id===editingId&&s.series===series),base=withoutSofas(cart,saved?[saved]:[]);
 const config=selection=>sofaConfiguration({series,selection,textileId:''},base,products);
 const modules=config({}).modules,pictured=sofaCardConfiguration(modules),fallback=modulePreset(modules,...(modules.every(p=>p.moduleRole==='middle')?[0,2]:[2,0]));
 const selection=saved?{...saved.selection}:moduleStartCandidates(modules,pictured?.selection,fallback).find(value=>value&&config(value).valid)||{};
 return {series,selection,textile:!!saved?.textileId,editingId:saved?.id||'',base,number:saved?setups.indexOf(saved)+1:setups.length+1};
}
export function rentalModuleView(context,state){
 const {products=[],days=null}=context,moduleSeries=state.series,moduleSelection=state.selection,moduleTextile=state.textile;
 const {html,rateGrid,rentalSelectionSummary,addonIcon,addonPrice,productTitle}=rentalProductOptions(context),selectedRentalDays=()=>days;
 const builderConfig=(selection=moduleSelection)=>sofaConfiguration({series:moduleSeries,selection,textileId:''},state.base||context.cart||{},products);
 const outdoorSeries=series=>products.some(p=>p.moduleSeries===series&&p.category==='Utemøbler');
function builderPresets(){if(builderConfig().modules.some(p=>requiredModuleQuantity(p)>0))return [{label:'Grunnsofa – 2 ender',ends:2,middle:0},{label:'2 ender + 1 midt',ends:2,middle:1},{label:'2 ender + 2 midt',ends:2,middle:2}];return builderConfig().modules.every(p=>p.moduleRole==='middle')?[{label:'1 modul',ends:0,middle:1},{label:'2 moduler',ends:0,middle:2},{label:'3 moduler',ends:0,middle:3}]:[{label:'2 ender',ends:2,middle:0},{label:'2 ender + 1 midt',ends:2,middle:1},{label:'2 midt',ends:0,middle:2}];}
function moduleTextileProduct(){return products.find(p=>p.isService&&products.some(m=>m.moduleSeries===moduleSeries&&m.relatedAddOns?.includes(p.id)));}
function moduleBasePricing(config){
 const components=Object.entries(moduleSelection).filter(([,quantity])=>quantity>0).map(([id,quantity])=>({id,quantity})),base={...config,isPackage:true,rentalPricingMode:'components',components};
 return rateGrid(base,{showPeriod:false}).replace('Leiepriser inkl. mva.','Leiepriser uten tilvalg, inkl. mva.');
}
function moduleSelectionPricing(config,textile){
 const days=selectedRentalDays(),extras=textile?{[textile.id]:1}:{},selection={...moduleSelection,...extras};
 const quote={hasExtras:!!textile,hasPeriodExtras:textile?.rentalPricingMode==='period',selectedTotal:days?packageGroupPeriodTotal({custom:true,selection},products,days):null};
 return rentalSelectionSummary(quote,extras,days);
}
function moduleTextileChoices(textile,config){
 if(!textile)return '';
 const available=remaining(textile.id,config.base,products)>0;
 return `<fieldset class="rental-options"><legend>2. Ønsker du tekstilpakke til sofaen?</legend><p class="hint">Valgfritt tillegg. Prisen kommer i tillegg til sofaen.</p><div class="addon-choices"><label class="addon-choice"><input type="radio" name="moduleTextileChoice" value="" ${moduleTextile?'':'checked'}><span><strong>Nei takk</strong><small>Kun sofaen</small></span></label><label class="addon-choice"><input type="radio" name="moduleTextileChoice" value="${html(textile.id)}" ${moduleTextile?'checked':''} ${available?'':'disabled'}>${addonIcon(textile)}<span><strong>${html(textile.name)}</strong><small>${addonPrice(textile)}</small><small>${html(textile.description)}</small></span></label></div><p class="hint">Én tekstilpakke gjelder hele sofaoppsettet, uansett antall moduler.</p></fieldset>`;
}
 const config=builderConfig(),textile=moduleTextileProduct();
 const guidance=config.modules.some(p=>requiredModuleQuantity(p)>0)?'Obligatoriske moduler følger med. Du kan legge til flere moduler innenfor tilgjengelig beholdning.':config.modules.every(p=>p.moduleRole==='middle')?'Sett sammen ønsket antall loungemoduler. Du kan bygge flere separate oppsett.':'Sett sammen moduler fra samme serie. En sofa kan ha maks to endemoduler, én på hver side. Legg til et nytt oppsett for flere sofaer.';
 let preview=config.count?modulePhotoPreview(config.modules,moduleSelection):'<p>Velg moduler for å se oppsettet.</p>';
 preview+=rentalStatusBadge(rentalSeriesRentedOut(config.modules,moduleSelection));
 if(config.modules.some(p=>moduleSelection[p.id]&&isKiPhoto(p.builderImage||p.image)))preview=preview.replace(/<figcaption>[\s\S]*?<\/figcaption>/,'<figcaption>'+kiDisclosure+'</figcaption>');
 const notice=rentalStatusNotice(rentalSeriesRentedOut(config.modules,moduleSelection));
 const presets=builderPresets().map(p=>config.modules.some(m=>m.moduleRole==='chaise')?{...p,label:p.label.replace(/midt/g,'sjeselong')}:p);
 const presetMarkup=presets.map((preset,i)=>{const selection=modulePreset(config.modules,preset.ends,preset.middle),valid=selection&&builderConfig(selection).valid;return `<button type="button" data-module-preset="${i}" ${valid?'':'disabled'}>${preset.label}</button>`;}).join('');
 let references=[...new Set(config.modules.flatMap(p=>p.gallery||[]))].map((src,i)=>`<figure><img src="${html(src)}" alt="${src.includes('sofa-tekstilpakke-')?'Eksempel med tekstilpakke':outdoorSeries(moduleSeries)?'Produktbilde':'Eksempel på sammensetning'} av ${html(moduleSeries)}"><figcaption>${isKiPhoto(src)?kiDisclosure:src.includes('sofa-tekstilpakke-')?'Eksempel med tekstilpakke':outdoorSeries(moduleSeries)?'Produktbilde':'Eksempel på sammensetning'}</figcaption></figure>`).join('');
 if(references)references='<details><summary>Se produkt- og miljøbilder</summary><div class="module-reference-grid">'+references+'</div></details>';
 const choices=config.modules.map(p=>{const available=remaining(p.id,config.base,products),quantity=moduleSelection[p.id]||0,maximum=Math.min(available,moduleQuantityLimit(config.modules,moduleSelection,p));return `<div class="module-choice">${p.image?`<img class="module-thumb" src="${html(p.image)}" ${responsiveImageAttributes(p.image,'(max-width:640px) 50vw, (max-width:1000px) 33vw, 25vw')} alt="${html(productTitle(p))}">`:""}<div class="module-copy"><h3>${html(productTitle(p))}</h3>${isRentedOut(p)?'<strong class="rental-status-inline">UTLEID</strong>':''}${['left','right','end'].includes(p.moduleRole)?`<p class="module-end-note">${p.moduleRole==='end'?'Universell ende · maks to per sofa':p.moduleRole==='left'?'Venstre ende · maks én per sofa':'Høyre ende · maks én per sofa'}</p>`:''}<p>${html(p.material)} · ${requiredModuleQuantity(p)>0?'Minst '+requiredModuleQuantity(p)+' må inngå':available+' kan velges'}</p><p>${p.priceOnRequest?'Pris på forespørsel':priceMarkup(p.price)+'/døgn · '+priceMarkup(p.weekPrice)+'/uke · '+priceMarkup(p.monthPrice)+'/måned'}</p><details class="module-info"><summary>Om modulen</summary><p>${html(p.description)}</p></details></div><div class="quantity"><button type="button" data-module-change="${p.id}" data-module-delta="-1" aria-label="Færre ${html(productTitle(p))}" ${quantity>requiredModuleQuantity(p)?'':'disabled'}>−</button><output aria-label="Valgt antall ${html(productTitle(p))}">${quantity}</output><button type="button" data-module-change="${p.id}" data-module-delta="1" aria-label="Flere ${html(productTitle(p))}" ${quantity<maximum?'':'disabled'}>+</button></div></div>`;}).join('');
 const basePrices=`<p class="selection-total-label"><span>${config.count} moduler</span><span class="module-width">${config.widthKnown?'Samlet bredde: ca. '+new Intl.NumberFormat('nb-NO').format(config.width)+' cm':'Mål avklares'}</span></p>${moduleBasePricing(config)}`;
 const textileChoices=moduleTextileChoices(textile,config),summary=(config.valid?moduleSelectionPricing(config,moduleTextile?textile:null):'<p class="hint">Velg gyldig antall for å se samlet pris.</p>')+(config.minimum>1?'<p class="hint" role="status">Velg minst '+config.minimum+' moduler totalt fra denne serien. Tilvalg teller ikke.</p>':'')+'<p class="rate-caption">Bildevisningen viser en rett oppstilling. Skjøter og perspektiv kan avvike; dette er ikke en måltegning. Vi bekrefter kombinasjon og tilgjengelighet i tilbudet.</p>';
 return {config,guidance,preview,notice,presets:presetMarkup,references,choices,basePrices,textileChoices,summary,saveLabel:state.editingId?'Lagre oppsettet':'Legg til leieforespørsel',eyebrow:outdoorSeries(moduleSeries)?'UTEMODULER · DITT OPPSETT':'MODULSOFA · DITT OPPSETT'};
}
export function rentalModuleSurface(context,state){
 const view=rentalModuleView(context,state),{html}=rentalProductOptions(context);
 return '<section id="modules" class="product-page-surface" data-initial-builder="modules" aria-labelledby="moduleTitle" inert><div class="module-scroll"><div class="module-stage"><div id="modulePreview" class="module-preview">'+view.preview+'</div>'+view.notice+'<div id="moduleReferences" class="module-references">'+view.references+'</div><section class="rental-options" data-product-rental-period aria-label="Leieperiode for produktet">'+productPeriodMarkup()+'</section><div id="modulePresets" class="module-presets" role="group" aria-label="Forslag til oppsett">'+view.presets+'</div><p class="hint">'+view.guidance+'</p></div><div class="module-controls"><div class="module-heading"><div><p class="eyebrow">'+view.eyebrow+'</p><h1 id="moduleTitle">'+html(state.series)+'</h1></div><button class="close" aria-label="Lukk sofabygger" data-close="modules" hidden>✕</button></div><div id="moduleChoices">'+view.choices+'</div><div id="moduleBasePrices" aria-live="polite">'+view.basePrices+'</div><div id="moduleTextileOptions">'+view.textileChoices+'</div><div id="moduleSummary" class="rental-options" aria-label="Samlet pris for valget" aria-live="polite">'+view.summary+'</div><div class="module-actions"><button class="button button-outline" data-close="modules" hidden>Tilbake til utvalget</button><button class="button dark" id="saveModules" '+(view.config.valid?'':'disabled')+'>'+view.saveLabel+'</button></div></div></div></section>';
}
export function rentalWallView(context,id,quantity=1){
 const {products=[],cart={}}=context,{html,rateGrid}=rentalProductOptions(context),p=products.find(x=>x.id===id);
 const items=products.filter(x=>isWall(x)&&x.wallGroup===p?.wallGroup).sort((a,b)=>(a.wallOrder||0)-(b.wallOrder||0)||a.name.localeCompare(b.name,'nb'));
 const layouts=items.map(p=>`<label class="wall-layout"><input type="radio" name="wallLayout" value="${p.id}" ${p.id===id?'checked':''}>${frameSketch(p.wallFrames?.length?p.wallFrames:presetFrames('gallery'),'Skisse: '+p.name)}${rentalStatusBadge(isRentedOut(p))}<strong>${html(wallLabel(p))}</strong><small>${p.priceOnRequest?'Pris på forespørsel':priceMarkup(p.price)+'/døgn'}</small></label>`).join('');
 const valid=p&&Number.isInteger(quantity)&&quantity>0&&quantity<=remaining(p.id,cart,products),q=quantity;
 const summary=(valid?`<p><strong>${q} × ${html(wallLabel(p))}</strong></p>${rateGrid({...p,price:p.price*q,weekPrice:p.weekPrice*q,monthPrice:p.monthPrice*q})}<p class="hint">Stylistens sammensetning inngår. Størrelser og plassering kan variere noe fra illustrasjonen, men helhetsuttrykket beholdes.</p>`:'<p class="hint">Velg et gyldig antall bildevegger.</p>')+rentalStatusNotice(isRentedOut(p));
 return {layouts,summary,valid};
}
export function rentalWallSurface(context,id){
 const view=rentalWallView(context,id),{html}=rentalProductOptions(context),p=context.products.find(x=>x.id===id);
 return '<section id="wall" class="product-page-surface" data-initial-builder="wall" aria-labelledby="wallTitle" inert><div class="module-heading"><div><p class="eyebrow">BILDEVEGG · STYLISTENS SAMMENSETNING</p><h1 id="wallTitle">'+html(p.name)+'</h1></div><button class="close" data-close="wall" aria-label="Lukk bildeveggvelger" hidden>✕</button></div><div class="wall-scroll"><p class="wall-intro">Velg ønsket oppsett. Stylisten velger motiver og rammer og setter sammen helheten. Bildene og skissene er illustrasjoner. Størrelser og plassering kan variere noe fra skissen, men helhetsuttrykket beholdes.</p><fieldset class="wall-field"><legend>1. Velg oppsett</legend><div id="wallLayouts" class="wall-layouts">'+view.layouts+'</div></fieldset><div class="wall-field"><label for="wallQuantity">Antall bildevegger</label><input id="wallQuantity" type="number" min="1" max="99" step="1" value="1"></div><section class="rental-options" data-product-rental-period aria-label="Leieperiode for produktet">'+productPeriodMarkup()+'</section><div id="wallSummary" aria-live="polite">'+view.summary+'</div><p class="hint">Motiver, rammer, endelige mål og tilgjengelighet bekreftes i tilbudet. Oppheng og montering avtales separat.</p></div><div class="product-actions"><button class="button button-outline" data-close="wall" hidden>Avbryt</button><button class="button dark" id="addWall" '+(view.valid?'':'disabled')+'>Legg til leieforespørsel</button></div></section>';
}
