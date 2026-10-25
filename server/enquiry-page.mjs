// Reuse the checkout markup and bootstrap of the corresponding storefront.
export function enquiryPageHtml(source,mode='rent'){
 const title=mode==='buy'?'Din kjøpsforespørsel':'Din leieforespørsel';
 return source.replace('href="#slik-kjoper-du"','href="/kjop.html#slik-kjoper-du"').replace(/<title>[\s\S]*?<\/title>/,'<title>'+title+' | Konseptuell</title>')
  .replace(/<body\b([^>]*)>/,'<body$1 data-enquiry-page="true">')
  .replace(/<main\b([^>]*)>/,'<main$1 hidden inert>')
  .replace('</main>','</main><main id="enquiryPage"><p id="enquiryLoading" role="status">Laster forespørselen …</p><noscript>Slå på JavaScript for å se og sende forespørselen. <a href="/">Til forsiden</a></noscript></main>')
  .replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/enquiry-page.css?v=enquirypage20261025b"></head>');
}
