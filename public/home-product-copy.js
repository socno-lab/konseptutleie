export const defaultProductCopy={
 productsHeading:'Møbler til det du planlegger.',
 productsIntro:'Lei enkeltvis eller sett sammen flere produkter.\nVelg antall og leieperiode i forespørselen.'
};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const productCopy=home=>Object.fromEntries(Object.entries(defaultProductCopy).map(([key,fallback])=>[key,home?.[key]??fallback]));
export const productIntroHtml=value=>esc(value).replace(/\n/g,'<br>');
export function applyProductCopy(doc,home){
 const copy=productCopy(home),heading=doc.getElementById('homeProductsHeading'),intro=doc.getElementById('homeProductsIntro');
 if(heading)heading.textContent=copy.productsHeading;
 if(intro)intro.innerHTML=productIntroHtml(copy.productsIntro);
}
export function renderProductCopy(html,home){
 const copy=productCopy(home);
 return html.replace(/(<h2 id="homeProductsHeading">)[\s\S]*?(<\/h2>)/,(_,open,close)=>open+esc(copy.productsHeading)+close)
  .replace(/(<p id="homeProductsIntro">)[\s\S]*?(<\/p>)/,(_,open,close)=>open+productIntroHtml(copy.productsIntro)+close);
}
