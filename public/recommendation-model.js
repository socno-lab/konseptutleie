import {salesEnabled} from './sales-model.js';
import {variantFields} from './product-variants.js';
import {productSubcategory} from './catalog-subcategories.js';
import {remaining} from './catalog-model.js';
import {resolvedProductPurposes} from './rental-purpose-model.js';
export function recommendationFamily(p){return variantFields(p).variantGroup||p.moduleSeries||p.id;}
export function recommendationCandidate(p){return !!p&&!p.isPackage&&!p.isService&&!p.addonOnly&&!p.wallGroup&&!p.isExample;}
export function validRecommendationIds(value){if(value===undefined)return [];if(!Array.isArray(value)||value.length>4||new Set(value).size!==value.length||value.some(id=>typeof id!=='string'||!/^[a-z0-9_-]{1,80}$/.test(id)))throw Error('Velg opptil fire ulike anbefalte produkter.');return [...value];}
function eligible(p,current,all,mode,context){
 if(!recommendationCandidate(p)||!p.active||p.deletedAt||!p.image||p.id===current.id||recommendationFamily(p)===recommendationFamily(current)||p.moduleSeries&&p.moduleSeries===current.moduleSeries)return false;
 if(p.moduleSeries&&['middle','right'].includes(p.moduleRole)&&!p.moduleRequired)return false;
 if(mode==='buy')return salesEnabled(p);
 return p.rentalEnabled!==false&&remaining(p.id,context.basket||{},all)>0&&(!context.bruk||context.bruk==='alle'||resolvedProductPurposes(p).includes(context.bruk));
}
const complements={
 'Modulsofaer':['Sofabord','Loungestoler','Gulvtepper','Sidebord','Bordlamper'],
 '2-setere':['Sofabord','Loungestoler','Gulvtepper','Sidebord'],
 '3-setere':['Sofabord','Loungestoler','Gulvtepper','Sidebord'],
 'Andre sofaer':['Sofabord','Loungestoler','Gulvtepper','Sidebord'],
 'Loungestoler':['Sidebord','Sofabord','Gulvlamper','Bordlamper'],
 'Spisestoler':['Spisebord','Taklamper','Sidebord'],
 'Spisebord':['Spisestoler','Taklamper','Kommoder'],
 'Sofabord':['Loungestoler','Modulsofaer','2-setere','3-setere','Gulvtepper'],
 'Sidebord':['Loungestoler','Bordlamper','Modulsofaer'],
 'Loungemoduler':['Utebord','Utestoler','Portable lamper'],
 'Utestoler':['Utebord','Loungemoduler','Portable lamper'],
 'Utebord':['Utestoler','Loungemoduler','Portable lamper'],
 'Bordlamper':['Sidebord','Nattbord','Kommoder'],
 'Portable lamper':['Sidebord','Sofabord','Utebord'],
 'Gulvlamper':['Loungestoler','Sofabord'],
 'Gulvtepper':['Sofabord','Loungestoler','Modulsofaer']
};
function signals(p){const text=[p.name,p.material,p.variantLabel].join(' ').toLowerCase();return [/(?:eik|oak)/.test(text)?'eik':'',/valnøtt|walnut/.test(text)?'valnøtt':'',/marmor|marble/.test(text)?'marmor':'',/beige|sand|natur|offwhite|off-white|hvit|white/.test(text)?'lys':'',/svart|black|mørk|dark/.test(text)?'mørk':'',/brun|brown|mocca/.test(text)?'brun':''].filter(Boolean);}
export function recommendProducts(current,all,mode='rent',context={}){
 const candidates=all.filter(p=>eligible(p,current,all,mode,context));const manual=(current.recommendedProducts||[]).map(id=>candidates.find(p=>p.id===id)).filter(Boolean);
 const type=productSubcategory(current),preferred=complements[type]||[],ownSignals=signals(current);
 const score=p=>{const sub=productSubcategory(p),position=preferred.indexOf(sub);if(position<0&&p.category!==current.category)return 0;return (position<0?12:80-position*5)+signals(p).filter(s=>ownSignals.includes(s)).length*9;};
 const ranked=manual.length?manual:candidates.map((p,index)=>({p,index,score:score(p)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.p);
 const families=new Set();const distinct=ranked.filter(p=>{const key=recommendationFamily(p);if(families.has(key))return false;families.add(key);return true;});if(manual.length)return distinct.slice(0,4);const types=new Set(),diverse=[];for(const p of distinct){const kind=productSubcategory(p)||p.category;if(!types.has(kind)){types.add(kind);diverse.push(p);}}return [...diverse,...distinct.filter(p=>!diverse.includes(p))].slice(0,4);
}
