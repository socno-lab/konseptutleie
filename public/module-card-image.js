import {joinedModuleCover} from './module-joined-profiles.js?v=lagoon20261025';

// Catalogues and rental alternatives show the same example of a complete sofa.
export function moduleCardImage(modules){
 if(!modules.length)return '';
 return joinedModuleCover(modules)||(modules.some(p=>p.category==='Utemøbler')?modules[0].image:modules.flatMap(p=>p.gallery||[])[0]||modules[0].image)||'';
}
