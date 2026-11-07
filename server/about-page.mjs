// Names, roles and original portraits supplied by the owner's existing About page.
// Source: https://konseptboligstyling.no/om-oss (reviewed 2026-11-07).
export const aboutTeam=[
 ['Camilla Smebye','Daglig leder','camilla-smebye'],
 ['Henriette D. Brønlund','I permisjon','henriette-bronlund'],
 ['Ida Sandbeklien','Interiørdesigner / Boligstylist','ida-sandbeklien'],
 ['Oda M. Larsen','Interiørdesigner / Boligstylist','oda-larsen'],
 ['Mia Hagberg','Produktdesigner / Boligstylist','mia-hagberg'],
 ['Birgitte Ager-Hanssen','Interiørarkitekt / Boligstylist','birgitte-ager-hanssen'],
 ['Andreas Bygdås','Økonomi',null]
];
export function aboutPageHtml(source){
 const head=source.slice(0,source.indexOf('</head>'));
 const shell=source.slice(source.indexOf('</head>')+7,source.indexOf('<main'))
 .replace(/<body\b[^>]*>/,'<body class="about-page">')
 .replace(/<nav class="mobile-commerce-mode-switch"[\s\S]*?<\/nav>/g,'')
 .replace(/<button\b([^>]*class="bag"[^>]*)>([\s\S]*?)<\/button>/,(_,attrs,content)=>'<a '+attrs.replace(/id="openCart"/,'href="/foresporsel.html"')+'>'+content+'</a>');
 const footer=(source.match(/<footer\b[\s\S]*?<\/footer>/)?.[0]||'').replace('<span id="year"></span>',String(new Date().getFullYear())).replace('</footer>','<nav class="customer-links" aria-label="Vilkår og personvern"><a href="/kundeinfo.html#leiebetingelser">Leiebetingelser</a><a href="/kundeinfo.html#kjopsvilkar">Kjøpsvilkår</a><a href="/kundeinfo.html#personvern">Personvern</a><a href="/kundeinfo.html#informasjonskapsler">Informasjonskapsler</a></nav></footer>');
 return head+'<link rel="stylesheet" href="/about-page.css?v=about20261107"></head>'+shell+
 `<main class="about-main">
 <section class="about-intro" aria-labelledby="aboutTitle">
 <div><p class="eyebrow">OM OSS</p><h1 id="aboutTitle">Menneskene bak Konseptuell</h1>
 <p class="about-lead">Møbler, interiør og dekor – til rommet og anledningen.</p>
 <p>Konseptuell er en del av Konsept Boligstyling AS. Vi gjør møbler og interiør fra vårt eget lager tilgjengelig for leie og kjøp, med hjelp fra et team som arbeider med styling og innredning til daglig.</p>
 <p>Du kan velge ett møbel, en ferdig pakke eller få et forslag tilpasset behovet ditt. Vi hjelper med møbler og dekor til bolig, arbeidsplass, messe, fest og produksjoner innen foto, film og reklame.</p>
 <a class="text-button" href="/foresporsel.html">Fortell oss hva du trenger ↗</a></div>
 <img class="about-team-photo" src="/assets/team/team.jpg" width="1280" height="1920" alt="Teamet i Konsept Boligstyling samlet" fetchpriority="high">
 </section>
 <section class="about-story" aria-labelledby="aboutApproach"><p class="eyebrow">VÅR TILNÆRMING</p><h2 id="aboutApproach">Et gjennomtenkt uttrykk, tilpasset deg</h2>
 <p>Vi liker rene linjer, naturlige materialer og harmoniske farger. Med erfaring fra boligstyling og interiørdesign setter vi sammen møbler, tekstiler og dekor til en helhet som passer rommet og bruken.</p>
 <p>Ombruk og lang levetid er en naturlig del av arbeidet vårt. Gjennom utleie får møblene være med på flere anledninger. Trenger du fullstyling eller delstyling før boligsalg, finner du tjenestene hos <a href="https://konseptboligstyling.no/om-oss">Konsept Boligstyling</a>.</p></section>
 <section class="about-team" aria-labelledby="teamTitle"><p class="eyebrow">TEAMET</p><h2 id="teamTitle">Møt oss</h2><p>Teamet i Konsept Boligstyling står også bak Konseptuell.</p>
 <div class="about-team-grid">${aboutTeam.map(([name,role,photo])=>'<article>'+(photo?'<img src="/assets/team/'+photo+'.jpg" alt="'+name+'" width="800" height="1200" loading="lazy" decoding="async">':'<div class="about-photo-placeholder" role="img" aria-label="Portrett av Andreas Bygdås kommer"><span>Bilde kommer</span></div>')+'<h3>'+name+'</h3><p>'+role+'</p></article>').join('')}</div></section>
 <section class="about-contact" aria-labelledby="aboutContact"><div><p class="eyebrow">LA OSS FINNE EN LØSNING</p><h2 id="aboutContact">Hva trenger du møbler til?</h2><p>Fortell oss om stedet, anledningen og uttrykket du ønsker. Vi avklarer innhold, pris og tilgjengelighet i et uforpliktende tilbud.</p><p><a href="mailto:post@konseptuell.no">post@konseptuell.no</a><br>Lager: Segelckes vei 15, 2010 Strømmen. Henting etter avtale.</p></div><a class="text-button" href="/foresporsel.html">Fortell oss hva du trenger ↗</a></section>
 </main>`+footer+'</body></html>';
}
