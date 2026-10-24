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

Transportikon i bekreftelser bruker samme hvite bildefelt som hovedproduktene, med et mindre, sentrert lastebilsymbol og god innvendig luft. Ikonet skal ikke fylle hele bildefeltet. Presisert av eier 24. oktober 2026.

E-post: bilde og produkttekst beholder hver sin tabellkolonne også på mobil. Tilvalgsikon sentreres vannrett og loddrett i bildekolonnen. Transportikon bygges inn som CID-vedlegg på samme måte som produktbilder, slik at det ikke avhenger av visning av eksterne bilder. Gjelder både kunde- og internbekreftelser. Rettet etter eiers skjermbilder 24. oktober 2026.

Kjøpskurven følger samme feltskala som leiekurven: kodefelt, Bruk kode-knapp og levering/henting er 48 px høye. Kontaktfelt, kode og leveringsvalg bruker samme skrifttype, 13 px på desktop og 16 px på mobil. Leveringsvalget fyller tilgjengelig feltbredde. Presisert av eier 24. oktober 2026.

Førstegangsbeskjed om prisgrunnlag: Ved bekreftet bruk i leieutvalget vises en kompakt forklaringsboks med valgt prisgrunnlag, pil mot Endre bruk/Endre og knapp «Forstått». Den ligger i dokumentflyten og dekker ikke produkter. Vises etter eventuell informasjon om funksjonell lagring, uten automatisk fokus eller scrolling. Kun eksplisitt «Forstått» lagrer bekreftelsen per nettleser, med sesjonsfallback når varig lagring er blokkert. Vanlig endring av bruk og priser beholdes.

Lanseringsgjennomgang 24. oktober 2026: Bruksområdekort har samme server- og klientmarkering slik at ferdig godkjent layout er på plass fra første visning. Lokale DM Sans-/Manrope-fonter beholder familier og vekter. Responsive mediakilder kan velges etter skjermbredde, mens opprinnelig src og eksisterende bildeutsnitt bevares. Separate leiesofaer beholdes som navngitte grupper i bekreftelsen med tilvalg under riktig oppsett. Ren kjøpsforespørsel bruker kjøpsspråk og transport uten retur. Dette er funksjonelle forbedringer innen samme design; se begrunnet gjennomgang i begge designreferansene.

Modulsofa i bekreftelse: Vis oppsett, moduler, tilvalg og deres prislinjer, men ingen egen delsum under sofaoppsettet. Samlet totalsum beholdes. Gjelder nettside samt kunde- og internmail, presisert av eier 24. oktober 2026. Vanlige pakkedelsummer beholdes.

Kategorien «Alle» viser enkeltprodukter, ferdige pakker og tjenester innen valgt bruksområde. Alle bruker vanlig produktkortformat med samme bildegeometri, typografi og prisrute; pakker merkes «Pakke» og tjenester «Tjeneste». Innholdslisten vises først når man åpner pakken. Filteret «Enkeltprodukter» utelater ferdigpakker og oppføringer med offeringType=service, men beholder vanlige produkter med legacy isService (for eksempel blomsteroppsett). «Se alle produkter» på forsiden fører til Alle; «Se enkeltprodukter» fra et bruksområde beholder sitt avgrensede utvalg. Kategorien «Pakker og tjenester» beholder dagens utvidede ready-package-card, også på mobil og for tjenester uten komponentprodukter. Detaljsider, priser, varianter, pakkeinnhold, tilvalg og adminoppføringer er de samme i begge visninger. Presisert og godkjent av eier 24. oktober 2026.

Prisgrunnlag har to valg på desktop og mobil: «Boligfoto og visning» og «Arrangementer og annen bruk». Sistnevnte har underteksten «Til selskap, messe, arbeidsplassen eller hjemmet.» Bruksområdekortene på forsiden beholdes for å finne relevant utvalg; de gir ikke egne prisnivåer. Eksisterende interne nøkler standard/messe, satser og lagrede valg beholdes. Godkjent av eier 24. oktober 2026.

Juleutvalget (bruk=jul): «Klart til jul» vises først blant treffene, både på mobil og desktop, også etter vanlig pakkeprioritering. Øvrige treff beholder innbyrdes rekkefølge. Søkeord, kategori, synlighet og valgt bruksområde gjelder fortsatt; andre bruksområder påvirkes ikke. Godkjent av eier 24. oktober 2026.

Katalogstyring: Admin kan prioritere produkter per bruksområde (inkludert Vis alle) med et valgfritt heltall. Tall prioriteres foran standardrekkefølgen, laveste først; tomt beholder vanlig rekkefølge. Samlede variant-, sofa- og bildeveggkort bruker laveste prioritet blant relevante medlemmer. Synlighet, bruksområder og prisgrunnlag endres ikke. «Klart til jul» er fortsatt standard først i juleutvalget når admin ikke har valgt annen prioritet.

Leieutvalget med generelt informasjonskort bygger først 23 faktiske produktkort på alle skjermbredder. Kortet avslutter siste rad og fyller én kolonne, også på mobil opptil 640 px. Mobilteksten er «Savner du noe?», «Vi har mye mer enn det som vises her. Fortell oss hva du trenger.» og «Fortell oss ↗», med vanlig korttypografi og høyde som produktraden. Den lange forklaringen og prismerknaden vises på desktop. Antall og fortsettknapp ligger tett under mobiloversikten. Pakkekortet i ferdige pakker beholder full bredde på mobil og 22 produkter foran. Dette fyller hele rader i 2,3 og 4 kolonner. «Vis 24 flere» legger til 24 faktiske produkter og beholder informasjonskortet sist. Kjøpsutvalget uten informasjonskort begynner med 24 produkter. Siste bolk viser gjenværende antall. Status med antall viste produkter og en grønn «Vis flere»-knapp står sentrert under hele oversikten; knappen er opptil 360 px bred og minst 52 px høy. Trefftekst, søk, kategori og underkategori gjelder hele katalogen. Samme filter beholder antallet ved pris-/kurvendringer; nye filtre begynner med første bolk. Tilbake fra produkt gjenoppretter lastet antall før posisjon. Ved endret skjermbredde eller eldre lagrede antall beholdes viste produkter, med høyst tre ekstra produkter for å avslutte raden. Informasjonskort teller ikke som produkt. Full katalog beholdes for kurv, lager, pakketilvalg og SEO. Presisert av eier 24. oktober 2026.

Leveringsinformasjon på forsiden: Hele Østlandet og henting på Strømmen etter avtale vises i eksisterende introtypografi. Leverings-FAQ forklarer større oppdrag andre steder og særskilt fraktberegning ved over 40 minutters kjøretid én vei fra lageret. Svartid «Vi svarer normalt innen én virkedag.» vises ved innsending, øverst på nettbekreftelsen og i kundens e-post for leie/kjøp. Eksisterende fonter, kolonner og ikoner beholdes. Godkjent av eier 24. oktober 2026.

Leveringsområde presisert av eier 24. oktober 2026: Forsiden opplyser også at større arrangementer og messer kan få levering i store deler av landet. FAQ presiserer at dette avtales. Eksisterende introtypografi, henting på Strømmen og fraktgrensen på 40 minutter én vei beholdes.
