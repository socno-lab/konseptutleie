# Felles designstandard – Konseptuell

Godkjent av eier 24. oktober 2026. Dette er standarden for nye og eksisterende sider. Les sammen med AGENTS.md og den tidligere godkjente forsiden i reference/home-design-lock.json.

## Felles uttrykk

Behold logo, grønn/hvit profil, DM Sans på nettstedet, typografihierarki, skillelinjer og luft. Gjenbruk eksisterende komponenter og deres regler. Metadata, SEO, ytelse eller nye funksjoner er ikke grunn til å innføre et annet visuelt uttrykk. E-post beholder sin godkjente e-posttilpassede typografi og hvite innholdsflate med logo innenfor.

## Produkt- og tjenestesider

Tjenester kan ha mer forklarende innhold, men følger produktenes typografiskala. Fastpris i detaljvisning: 13 px / vekt 500, som ordinære produktpriser. Mellomoverskrifter som «Dette er inkludert»: 14 px / vekt 600, som øvrige valgoverskrifter. Hovedtitler følger vanlige produkttitler. Ikke forstørr pris eller overskrift bare fordi varen er en tjeneste. Forsidens sesongfelt har ingen pris; prisene finnes på tjenestesiden. Variantpriser i oversikten bruker vanlig kompakt prisoppsett.

På enkeltproduktsiden viser oppsummeringen over døgn-/uke-/månedspris bare hovedproduktet og antallet. Valgte tilvalg vises i tilvalgsfeltet med egen pris og som egen prislinje i kurven; de skal ikke legges til i denne oppsummeringsteksten. Presisert av eier 24. oktober 2026.

Produktkort med fastpris per påbegynte 30 dager bruker vanlig tredelt prisrute: Døgn og Uke står uten pris, Måned · 30 døgn viser fastprisen fra produktdata. Samme prisfont og vekt som de øvrige kortene. Leieberegningen er fortsatt per påbegynte 30 dager. Presisert av eier 24. oktober 2026.

## Handlekurv og Din forespørsel

- Alle hovedprodukter og tjenester bruker samme produktlinje, navn-, pris- og informasjonstypografi. Fastpris får ikke større eller fetere pris enn ordinære leieprodukter.
- Modulsofa, stol, puff og andre hovedprodukter bruker nøyaktig samme bildefelt ved samme skjermbredde. Feltet er fast og kan ikke krympe. Behold eksisterende responsive mål, object-fit: contain og innvendig luft. Brede sofaer skal passe uten beskjæring, strekking eller større felt. Bilder og tekst starter på felles loddrette linjer.
- Sofaen kan ha ekstra informasjonslinjer for moduler og bredde, men ikke stor ramme eller egen pristabell. Endre, Dupliser og Fjern er diskrete tekstknapper. Konfigurering og egen sammensetning per sofa beholdes.
- Tilvalg vises rett under produktet de tilhører. Ingen stor bakgrunn, ramme eller produktbilde som gjør tilvalget like fremtredende som hovedproduktet. Lite semantisk ikon (pute, dekor, tre) ved manglende produktfoto.
- Tilvalgsikon i kurven er 32 × 32 px og sentreres både vannrett i bildekolonnen og loddrett i tilvalgsraden, også på mobil. Det skal fortsatt være mindre enn hovedproduktets bilde.
- Tilvalgenes antallsvelgere har samme knapper, skrift, avstand og plassering som hovedproduktets antallsvelgere: vanlige rader 32 × 40 px, 9 px mellomrom; eksisterende pakkerader 40 × 40 px uten mellomrom. Tall og knapper står på samme loddrette linjer som i tilhørende hovedrad. Tilvalgstekst og ikon forblir kompakte.
- Varsler fra handlinger i en åpen kurv/dialog skal vises skarpt i den aktive dialogen, ikke i den uskarpe bakgrunnen.

Datofelt og rabattkodefelt i leiekurven følger samme tekststørrelse og vekt som Anledning: 13 px / 400 på desktop, 16 px / 400 på mobil for å unngå feltzoom. Datofelt, rabattkodefelt og Bruk kode-knappen er 48 px høye og står på samme linje uten ekstra toppmarg på kodefeltet. Presisert av eier 24. oktober 2026.

## Bekreftelse på nettstedet og e-post

Vis bekreftet innhold med produkter, bilder/ikoner, antall og priser. Pakker er grupper av faktiske produkter med tilvalg under riktig produkt, ikke bare én tekstlinje med pakkeinnhold. Ikke tell pakkesummen dobbelt. Gruppering og rekkefølge skal samsvare mellom kurv, e-post og bekreftelsesside.

Leieperioden fremheves samlet og skrives dd.mm.åååå – dd.mm.åååå. Tilvalg er mindre fremtredende enn hovedproduktene. På bekreftelsessiden er tilvalgsikonet sentrert loddrett i raden. Behold tydelig mellomrom (24 px på bekreftelsessiden) etter mva.-teksten før Bruksområde og øvrige detaljer. E-post beholder e-postkompatibel HTML og eksisterende kompakt ikonstørrelse.

## Mobil og innlasting

Ingen horisontal scrolling, overlappende produkttekst, uventet zoom ved feltvalg eller hopping ved navn. Behold den felles datovelgeren med tydelig valgt intervall og synlig bekreftelsesknapp i første mobilvisning. Ikke vis gammel produktlayout, feil bilder eller feil kurvantall mens data lastes.

## Ved endringer

Kjør node build.mjs og relevante tester. Den eksisterende forsidelåsen og den nye presentasjonslåsen stopper bygg når beskyttet utforming endres. Dette er en kontroll som krever gjennomgang, ikke en garanti mot enhver visuell feil.

Ved legitim endring: sammenlign berørte visninger på desktop og mobil, kontroller funksjonene, oppdater denne standarden og referansen bevisst med begrunnelse. Ikke oppdater referansen automatisk bare for å få grønt bygg. Brukerens nye, uttrykkelige ønsker går foran denne godkjenningen. Pris, lager og innhold i admin kan fortsatt endres uten å endre designstandarden.

Referansebilder: reference/approved-cart-2026-10-24.png, reference/approved-receipt-2026-10-24.png og reference/approved-service-2026-10-24.png. De er visuelle kontroller av utforming med eksempeldata, ikke fasit for priser eller beholdning.

Bekreftelser viser transport som egen rad med lastebilikon, leveringsmåte og pris (også 0 kr eller uavklart). Standardtekst for tekstil-/dekortilvalg gjentas ikke under produktoversikten. Egne farge- og dyneønsker beholdes. Presisert av eier 24. oktober 2026.
