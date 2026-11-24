import headManifest from './enquiry-head-manifest.json' with {type:'json'};
import {streamlineHead} from './enquiry-head.mjs';
import manifest from './enquiry-bundle-manifest.json' with {type:'json'};
import {bundleEnquiryHtml} from './enquiry-bundle.mjs';
// Reuse the checkout markup and bootstrap of the corresponding storefront.
export function enquiryPageHtml(source,mode='rent',retry=false){
 const rentalStyle=mode==='rent'?'<link rel="stylesheet" href="/enquiry-intro.css?v=enquiryactions20261123">':'';
 const title=mode==='buy'?'Din kjøpsforespørsel':'Din leieforespørsel';
 if(mode==='rent')source=streamlineHead(bundleEnquiryHtml(source,manifest),headManifest);
 if(mode==='rent'&&retry)source=source.replaceAll('/rental-enquiry.bundle.js?v='+manifest.digest.slice(0,12),'/rental-enquiry.bundle.js?v='+manifest.digest.slice(0,12)+'&amp;retry=1');
 const routeBootstrap=source.includes('/rental-enquiry-head.js?')?'':'<script src="/request-route-bootstrap.js?v=customfirst20261115"></script>';
 return source.replace('href="#slik-kjoper-du"','href="/kjop.html#slik-kjoper-du"').replace(/<title>[\s\S]*?<\/title>/,'<title>'+title+' | Konseptuell</title>')
  .replace(/<body\b([^>]*)>/,'<body class="enquiry-page" data-enquiry-page="true">')
  // The app still needs the storefront's DOM hooks, but the hidden catalogue
  // never displays these images on the checkout route.
  .replace(/<main\b([^>]*)>([\s\S]*?)<\/main>/i,(_,attributes,contents)=>{
   const withoutImages=contents.replace(/<(?:img|source)\b[^>]*>/gi,tag=>tag.replace(/\s(?:src|srcset)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,''));
   return '<main'+attributes+' hidden inert>'+withoutImages+'</main>';
  })
  .replace('</main>','</main><main id="enquiryPage"><section id="enquiryLoading"><a class="text-button enquiry-back" href="'+(mode==='buy'?'/kjop.html':'/utvalg.html?bruk=alle')+'">← Fortsett å se produkter</a><p class="eyebrow">'+(mode==='buy'?'KJØPSFORESPØRSEL':'UFORPLIKTENDE LEIEFORESPØRSEL')+'</p><h1>'+title+'</h1><p role="status">Gjør forespørselen klar …</p>'+ (mode==='rent'?'<a hidden class="text-button" data-retry-cart href="/foresporsel.html">Prøv igjen</a>':'')+'</section><noscript>Slå på JavaScript for å se og sende forespørselen. <a href="/">Til forsiden</a></noscript></main>')
  .replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/enquiry-page.css?v=customfirst20261115">'+routeBootstrap+rentalStyle+'</head>');
}
