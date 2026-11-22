import {readFile} from 'node:fs/promises';

// Discover the entry module's imports once so preloads share the exact same versioned URLs.
const rentalEntry=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const imports=[...rentalEntry.matchAll(/^import .+? from ['"]\.\/([^'"]+)['"]/gm)].map(match=>'/'+match[1]);
// Reuse the checkout markup and bootstrap of the corresponding storefront.
export function enquiryPageHtml(source,mode='rent'){
 const rentalStyle=mode==='rent'?'<link rel="stylesheet" href="/enquiry-intro.css?v=enquiryremove20261122">':'';
 const title=mode==='buy'?'Din kjøpsforespørsel':'Din leieforespørsel';
 const entry=source.match(/<script\b[^>]*src="(\/app\.js[^"]*)"/)?.[1];
 if(mode==='rent'&&entry){
  const preload=[entry,...imports.filter(url=>/^\/(customer-info|rental-product-options|rental-catalog-view)\.js\?/.test(url))].map(href=>'<link rel="modulepreload" fetchpriority="low" href="'+href+'">').join('');
  source=source.replace('</head>',preload+'</head>');
 }
 return source.replace('href="#slik-kjoper-du"','href="/kjop.html#slik-kjoper-du"').replace(/<title>[\s\S]*?<\/title>/,'<title>'+title+' | Konseptuell</title>')
  .replace(/<body\b([^>]*)>/,'<body class="enquiry-page" data-enquiry-page="true">')
  // The app still needs the storefront's DOM hooks, but the hidden catalogue
  // never displays these images on the checkout route.
  .replace(/<main\b([^>]*)>([\s\S]*?)<\/main>/i,(_,attributes,contents)=>{
   const withoutImages=contents.replace(/<(?:img|source)\b[^>]*>/gi,tag=>tag.replace(/\s(?:src|srcset)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,''));
   return '<main'+attributes+' hidden inert>'+withoutImages+'</main>';
  })
  .replace('</main>','</main><main id="enquiryPage"><section id="enquiryLoading"><a class="text-button enquiry-back" href="'+(mode==='buy'?'/kjop.html':'/utvalg.html?bruk=alle')+'">← Fortsett å se produkter</a><p class="eyebrow">'+(mode==='buy'?'KJØPSFORESPØRSEL':'UFORPLIKTENDE LEIEFORESPØRSEL')+'</p><h1>'+title+'</h1><p role="status">Gjør forespørselen klar …</p></section><noscript>Slå på JavaScript for å se og sende forespørselen. <a href="/">Til forsiden</a></noscript></main>')
  .replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/enquiry-page.css?v=customfirst20261115"><script src="/request-route-bootstrap.js?v=customfirst20261115"></script>'+rentalStyle+'</head>');
}
