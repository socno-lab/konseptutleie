import {customerInformationPages} from '../public/customer-information-content.js';
export function customerInformationFirstPaint(html,settings){
 const pages=customerInformationPages(settings),markup=page=>'<h1>'+page[0]+'</h1>'+page[1];
 html=html.replace('<article id="customerInfo"></article>',()=>'<article id="customerInfo" data-page="kjopsvilkar">'+markup(pages.kjopsvilkar)+'</article>'+Object.entries(pages).map(([key,page])=>'<template id="initialInfo-'+key+'">'+markup(page)+'</template>').join('')+'<script src="/customer-info-bootstrap.js?v=sitefirst20261106"></script>');
 return html.replace('<nav class="customer-links" aria-label="Kundeinformasjon">','<nav class="customer-links" aria-label="Kundeinformasjon"><a href="#leiebetingelser">Leiebetingelser</a>').replace('</head>','<link rel="preload" as="script" href="/customer-info-bootstrap.js?v=sitefirst20261106"></head>');
}
