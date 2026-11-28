import {validPurpose,readPurposeState} from './rental-purpose-model.js?v=produktvalg2';
import {purposeForOccasion} from './rental-scope-markup.js?v=purposemodal20261122';
const get=(host,storage,key)=>{try{return host?.[storage]?.getItem(key);}catch{return null;}};
export function rememberedRentalPurpose(host=globalThis){
 for(const storage of ['sessionStorage','localStorage']){const purpose=validPurpose(get(host,storage,'konsept-purpose-v1'));if(purpose!=='alle')return purpose;}
 try{const draft=JSON.parse(get(host,'sessionStorage','konsept-enquiry-draft-rent')||'null');if(draft?.occasionConfirmed===true)return purposeForOccasion(draft.occasion);}catch{}
 return 'alle';
}
export function rememberRentalPurpose(purpose,host=globalThis){
 purpose=validPurpose(purpose);
 try{host.sessionStorage?.setItem('konsept-purpose-v1',purpose);}catch{}
 // Viewing all products must not erase the purpose belonging to the saved cart.
 if(purpose!=='alle')try{host.localStorage?.setItem('konsept-purpose-v1',purpose);}catch{}
}
export function rememberedPurposeState(href,host=globalThis,{hasItems=false,fallback='alle'}={}){
 const saved=rememberedRentalPurpose(host),state=readPurposeState(href,saved!=='alle'?saved:fallback);
 if(hasItems&&new URL(href).searchParams.get('bruk')==='alle'&&saved!=='alle')state.purpose=saved;
 return state;
}
