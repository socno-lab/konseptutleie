import {homeProductCards,homeSeasonContent,homeRateGrid} from '../public/home-sections.js?v=stockmobile20261107';
import {applyRentalScope} from '../public/rental-pricing-model.js?v=stockmobile20261107';
export function homeFirstPaint(html,products,settings){
 // Prices are supplied for both public usage levels; the parsing-time script selects the saved preference.
 const cards=scope=>homeProductCards(applyRentalScope(products,scope||'messe'),settings,p=>homeRateGrid(p,{confirmed:!!scope,products:applyRentalScope(products,scope||'messe')}));
 html=html.replace('<div id="homeProducts" class="home-product-grid"></div>',()=>'<div id="homeProducts" class="home-product-grid">'+cards(null)+'</div>'+['standard','messe'].map(scope=>'<template id="initialHome-'+scope+'">'+cards(scope)+'</template>').join('')+'<script src="/home-first-paint.js?v=production20261107"></script>');
 const season=homeSeasonContent(products,settings.home);
 return html.replace(/<section class="home-season section" id="homeSeason"[^>]*><\/section>/,()=>'<section class="home-season section" id="homeSeason" aria-label="Sesongens forslag"'+(season?'':' hidden')+'>'+season+'</section>').replace('</head>','<link rel="preload" as="script" href="/home-first-paint.js?v=production20261107"></head>');
}
