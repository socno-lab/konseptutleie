// Choose the final image before first paint, never by changing src after load.
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;');
export const contentHeroSizes='(max-width:800px) 90vw, (max-width:1600px) 46vw, 730px';
export function contentHeroAttributes(src){
 let candidates;
 if(src==='/assets/messe/event-lounge.jpg')candidates=[640,960,1600].map(w=>`/assets/messe/event-lounge-${w}.webp ${w}w`);
 else if(/^\/media\/[a-f0-9]{32}$/.test(src||''))candidates=[320,640,1280].map(w=>`${src}?thumb=${w} ${w}w`);
 else return '';
 return `srcset="${escape(candidates.join(', '))}" sizes="${contentHeroSizes}"`;
}
