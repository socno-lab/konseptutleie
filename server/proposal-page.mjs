// Reuse the storefront shell and fonts; this page has no checkout bootstrap.
export function proposalPageHtml(source){
 const head=source.slice(0,source.indexOf('</head>')).replace(/<title>[\s\S]*?<\/title>/,'<title>Fortell oss hva du trenger | Konseptuell</title>');
 const shell=source.slice(source.indexOf('</head>')+7,source.indexOf('<main')).replace(/<body\b[^>]*>/,'<body class="proposal-page">').replace(/<nav class="mobile-commerce-mode-switch"[\s\S]*?<\/nav>/g,'');
 const footer=source.match(/<footer\b[\s\S]*?<\/footer>/)?.[0]||'';
 return head+'<script src="/request-route-bootstrap.js?v=sitefirst20261106"></script><meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/proposal-form.css?v=proposal20261105"><script type="module" src="/proposal-form.js?v=stockall20261107"></script></head>'+shell+`<main class="proposal-main" id="proposalMain">
<a class="text-button" href="/">← Til forsiden</a>
<p class="eyebrow">ET FORSLAG SOM PASSER DEG</p><h1>Fortell oss hva du trenger</h1>
<p class="proposal-intro">Beskriv behovet ditt, så hjelper vi deg å finne møbler og dekor som passer. Du trenger ikke velge produkter først.</p>
<form id="proposalForm">
<label>Hva trenger du? *<textarea name="customRequest" rows="4" maxlength="3000" required placeholder="Fortell om anledningen, hva du trenger og gjerne antall gjester eller ønsket stil."></textarea></label>
<div class="proposal-grid"><label>Dato eller periode (valgfritt)<input name="period" maxlength="300" placeholder="For eksempel i desember eller ikke bestemt"></label><label>Sted *<input name="place" maxlength="300" required placeholder="By, område eller navn på lokalet"></label></div>
<label>Budsjett (valgfritt)<input name="budget" maxlength="200" placeholder="For eksempel ca. 15 000 kr totalt inkl. mva."><span class="hint">Et omtrentlig budsjett hjelper oss å tilpasse forslaget.</span></label>
<div class="proposal-grid"><label>Navn *<input name="name" autocomplete="name" maxlength="100" required></label><label>E-post *<input name="email" type="email" autocomplete="email" maxlength="200" required></label><label>Telefon (valgfritt)<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label>Firma (valgfritt)<input name="company" autocomplete="organization" maxlength="150"></label></div>
<input type="text" name="website" tabindex="-1" autocomplete="off" hidden aria-hidden="true">
<p class="hint">Uforpliktende forespørsel · vi svarer normalt innen én virkedag. Pris og tilgjengelighet avklares i tilbudet. Vi bruker opplysningene til å følge opp forespørselen din. <a href="/kundeinfo.html#personvern">Les om personvern</a>.</p>
<button class="button dark" type="submit">Send forespørsel ↗</button><p id="proposalStatus" role="status" aria-live="polite"></p>
</form><noscript>Slå på JavaScript for å sende skjemaet, eller kontakt <a href="mailto:post@konseptuell.no">post@konseptuell.no</a>.</noscript>
</main>`+footer+'</body></html>';
}
