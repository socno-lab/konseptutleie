const link=(title,href)=>`<a href="${href}">${title}</a>`;
export function renderPrimaryNavigation(html){
 return html.replace(/<nav\b[^>]*aria-label="Hovedmeny"[^>]*>[\s\S]*?<\/nav>/,()=>{
 const categories=['Bord','Stoler','Sofaer','Belysning','Utemøbler','Dekor'];
 return '<nav aria-label="Hovedmeny" class="primary-navigation"><details class="primary-dropdown"><summary>Leie <span aria-hidden="true">⌄</span></summary><div class="primary-dropdown-panel"><strong>Finn møbler</strong>'+link('Se alle produkter','/utvalg.html?bruk=alle#utvalg')+categories.map(c=>link(c,'/utvalg.html?bruk=alle&amp;kategori='+encodeURIComponent(c)+'#utvalg')).join('')+link('Finn etter anledning','/#homeUseCases')+'</div></details>'+link('Kjøpe','/kjop.html')+'<a class="packages-nav" href="/utvalg.html?bruk=alle&amp;kategori=Pakker#utvalg">Pakker &amp; tjenester</a>'+link('Slik fungerer det','/#slik')+link('Om oss','/om-oss')+'<a class="primary-proposal" href="/tilpasset-foresporsel.html">Få et forslag</a></nav>';
 });
}
