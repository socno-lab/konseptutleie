// Reuse the checkout markup and bootstrap of the corresponding storefront.
export function enquiryPageHtml(source,mode='rent'){
 const title=mode==='buy'?'Din kjøpsforespørsel':'Din leieforespørsel';
 return source.replace('href="#slik-kjoper-du"','href="/kjop.html#slik-kjoper-du"').replace(/<title>[\s\S]*?<\/title>/,'<title>'+title+' | Konseptuell</title>')
  .replace(/<body\b([^>]*)>/,'<body class="enquiry-page" data-enquiry-page="true">')
  .replace(/<main\b([^>]*)>/,'<main$1 hidden inert>')
  .replace('</main>','</main><main id="enquiryPage"><section id="enquiryLoading"><a class="text-button enquiry-back" href="'+(mode==='buy'?'/kjop.html':'/utvalg.html?bruk=alle')+'">← Fortsett å se produkter</a><p class="eyebrow">'+(mode==='buy'?'KJØPSFORESPØRSEL':'UFORPLIKTENDE LEIEFORESPØRSEL')+'</p><h1>'+title+'</h1><p role="status">Gjør forespørselen klar …</p></section><noscript>Slå på JavaScript for å se og sende forespørselen. <a href="/">Til forsiden</a></noscript></main>')
  .replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/enquiry-page.css?v=sitefirst20261106"><script src="/request-route-bootstrap.js?v=sitefirst20261106"></script></head>');
}
