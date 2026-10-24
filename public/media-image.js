const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Keep src unchanged: existing per-image framing and full-size zoom use that URL.
export function responsiveImageAttributes(src,sizes='(max-width:640px) 50vw, (max-width:1000px) 33vw, 25vw'){
 if(!/^\/media\/[a-f0-9]{32}$/.test(src||''))return '';
 return `srcset="${[320,640,1280].map(w=>escape(src)+'?thumb='+w+' '+w+'w').join(', ')}" sizes="${escape(sizes)}"`;
}
