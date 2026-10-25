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

Katalogstyring: I kategorien «Alle» vises ferdigpakkene etter enkeltprodukter og tjenester som standard. Den innbyrdes rekkefølgen beholdes i begge grupper. Pakkeoversikten og andre kategorier beholder tidligere standardrekkefølge. Admin kan fortsatt overstyre dette med en uttrykkelig prioritet per bruksområde (inkludert Vis alle), som er et valgfritt heltall. Tall prioriteres foran standardrekkefølgen, laveste først; tomt beholder vanlig rekkefølge. Samlede variant-, sofa- og bildeveggkort bruker laveste prioritet blant relevante medlemmer. Synlighet, bruksområder og prisgrunnlag endres ikke. «Klart til jul» er fortsatt standard først i juleutvalget når admin ikke har valgt annen prioritet.

Leieutvalget med generelt informasjonskort bygger først 23 faktiske produktkort på alle skjermbredder. Kortet avslutter siste rad og fyller én kolonne, også på mobil opptil 640 px. Mobilteksten er «Savner du noe?», «Vi har mye mer enn det som vises her. Fortell oss hva du trenger.» og «Fortell oss ↗», med vanlig korttypografi og høyde som produktraden. Den lange forklaringen og prismerknaden vises på desktop. Antall og fortsettknapp ligger tett under mobiloversikten. Pakkekortet i ferdige pakker beholder full bredde på mobil og 22 produkter foran. Dette fyller hele rader i 2,3 og 4 kolonner. «Vis 24 flere» legger til 24 faktiske produkter og beholder informasjonskortet sist. Kjøpsutvalget uten informasjonskort begynner med 24 produkter. Siste bolk viser gjenværende antall. Status med antall viste produkter og en grønn «Vis flere»-knapp står sentrert under hele oversikten; knappen er opptil 360 px bred og minst 52 px høy. Trefftekst, søk, kategori og underkategori gjelder hele katalogen. Samme filter beholder antallet ved pris-/kurvendringer; nye filtre begynner med første bolk. Tilbake fra produkt gjenoppretter lastet antall før posisjon. Ved endret skjermbredde eller eldre lagrede antall beholdes viste produkter, med høyst tre ekstra produkter for å avslutte raden. Informasjonskort teller ikke som produkt. Full katalog beholdes for kurv, lager, pakketilvalg og SEO. Presisert av eier 24. oktober 2026.

Leveringsinformasjon på forsiden: Hele Østlandet og henting på Strømmen etter avtale vises i eksisterende introtypografi. Leverings-FAQ forklarer større oppdrag andre steder og særskilt fraktberegning ved over 40 minutters kjøretid én vei fra lageret. Svartid «Vi svarer normalt innen én virkedag.» vises ved innsending, øverst på nettbekreftelsen og i kundens e-post for leie/kjøp. Eksisterende fonter, kolonner og ikoner beholdes. Godkjent av eier 24. oktober 2026.

Leveringsområde presisert av eier 24. oktober 2026: Forsiden opplyser også at større arrangementer og messer kan få levering i store deler av landet. FAQ presiserer at dette avtales. Eksisterende introtypografi, henting på Strømmen og fraktgrensen på 40 minutter én vei beholdes.

Overskrifter bruker rett skrift uten kursiv, også der deler av teksten er markert med em/i. Eksisterende skriftfamilier, størrelser, vekter, farger og linjeskift beholdes. Uttrykkelig bestilt av eier 24. oktober 2026.

Mobilmeny godkjent av eier 24. oktober 2026: ved opptil 640 px står menyknappen til venstre, logoen rett etter og eksisterende kurv som kompakt ikon med antall helt til høyre. Panelet åpnes fra venstre under headeren og dekker 68 % av bredden (76 % på skjermer opptil 360 px), med dempet klikkbart felt utenfor. Ingen X; samme menyknapp, trykk utenfor og Escape lukker. Hovedlenker etterfølges av adminstyrte bruksområdenavn. Panelet kan scrolles, siden bak låses, tastaturfokus holdes i aktiv meny/header og returneres ved lukking. Valg av lenke/kurv og overgang til desktop lukker menyen. Desktopmeny, forsidekort og øvrig typografi beholdes.

Mobilmeny, fokus presisert 24. oktober 2026: Åpning ved vanlig trykk flytter ikke fokus til første lenke. Kun tastatur-/hjelpemiddelåpning setter fokus der, med synlig fokusmarkering. Dermed får Leie ingen brun ramme ved vanlig trykk, mens tastaturmarkering beholdes.

Mobilheader fra første visning, presisert av eier 24. oktober 2026: serveren leverer ferdig menyknapp, headerkolonner og kompakt kurv i HTML før JavaScript kjører. Klienten kobler hendelser til de samme elementene uten å bygge headeren på nytt. Dette gjelder butikkmaler og 404. Nederste synlige menystripe flukter med underkanten av hovedordmerket KONSEPTUELL, ikke underteksten LEIE OG KJØP; ikonets eksisterende trykkflate beholdes.

Valgfritt kjøp etter leie, godkjent 25. oktober 2026: Kjøpsmuligheten vises separat fra leiesummen, med samlet pris for pakken og alle valgte tekstil-/dekortilvalg. Standard kjøpspriser inkl. mva. er 600 kr per tekstilpakke til lenestol, 1 200 kr per tekstilpakke til sofa og 900 kr per dekorpakke til Luana-/Heritage-sofabord. Admin kan endre tilvalgets egen kjøpspris etter leie uten å påvirke leie-/nypris. Nett- og e-postbekreftelsen bruker samme serverberegnede, lagrede oppsummering og frist minst to dager før avtalt retur (ønsket dato merkes som foreløpig grunnlag). Forhåndsbetalt henting trekkes bare fra ved kjøp hvis hentingen faktisk bortfaller; levering og betalt leie trekkes ikke fra. Ukjent transport eller gjenværende leievarer krever avklaring. Ingen kjøpssum inngår i leietotalen og ingen betaling antas gjennomført. Eksisterende typografi, produkt-/tilvalgsrader og bekreftelseskomponenter beholdes.

Prisplassering på vanlige produktsider med tilvalg, godkjent 25. oktober 2026: Antall og hovedproduktnavn står over tilvalgene uten gjentatt liste over tillegg. Behold kompakt døgn-/uke-/månedspris over valgene. «Uten tilvalg» står i den lille mva.-teksten under prisruten. Under tilvalgene og før legg-til-knappen vises samlet leiepris inkludert valgte tilvalg. Den valgfrie kjøpsprisen vises bare her, separat fra leie og uten gjentatte antall/produktlinjer. Gjenbruk samme prisrute, fonter og vekter. Samlet leie beregnes per faktisk produktlinje for 1/7/30 dager og valgt periode; tekstil/dekor beholder sin pris per påbegynte 30 dager. Pris på forespørsel gir ingen villedende komplett sum. Kurv, bekreftelser og spesialvelgere for servise/tjenester/jul beholdes.

Presisering 25. oktober 2026: Ingen egen «Leiepris uten tilvalg»-overskrift ved hovedproduktet. Valgfritt kjøpsbeløp og tilvalgenes kjøpsbeløp vises bare når leie med kjøpsmulighet er valgt. Samlet kjøpsbeløp vises i vanlig skriftvekt, separat fra leiesummen. Ved direkte kjøp vises kjøpspris som før.

Prisoverskriften under valgene er «Samlet leiepris for dette produktet», eller «Samlet leiepris for dette produktet med tilvalg» når tilvalg er valgt.

Pakkebekreftelser, presisert 25. oktober 2026: Ingen delsummer per pakke eller sofa i nettbekreftelse eller kunde-/intern e-post, verken for faste eller tilpassede pakker. Behold pakkenavn, alle produkt-/tilvalgsrader og priser, transport og samlet foreløpig total. Samme regel gjelder eldre lagrede forespørsler når de gjengis.

Totalsum i bekreftelser, godkjent 25. oktober 2026: «Beregnet leiesum» for leie, «Beregnet kjøpesum» for kjøp og «Beregnet sum for leie og kjøp» ved blandet forespørsel. Legg til «inkl. transport» når kjent transport inngår i summen, også transport inkludert i fastpris. Egen henting til 0 kr og ukjent transport skal ikke merkes som inkludert transport. Samme tekst i nettbekreftelse og kunde-/intern e-post; ukjent samlet pris beholder avklaringsmelding.

Handlekurvens «Leie eller kjøpe?»-felt, presisert 25. oktober 2026: Samme eksplisitte høyde 48 px, 1 px kantlinje, innvendig luft og typografi som Anledning/kontaktfeltene. 13 px / 400 på desktop og 16 px / 400 på mobil. Bruk height i tillegg til min-height for stabil Safari-visning. Endringen gjelder bare dette feltet i kurven.

Egen forespørselsside, godkjent 25. oktober 2026: Handlekurvknappen åpner hele forespørselssiden direkte, uten kort mellomvisning, både for leie og kjøp. Hele innholdet, tilvalg, leieperiode, transport og kontakt-/innsendingsskjema vises på /foresporsel.html (kjøp med type=kjop). Behold godkjente felt, vare-/tilvalgsrader og typografi. Pakkevarer viser kompakt døgn-/uke-/månedspris før dato er valgt, og beregnet linjepris for antall og valgt periode etterpå. Periodebaserte tilvalg beholder pris per påbegynte 30 dager. En kompakt leieperiodelenke øverst går til datofeltene; datoer og skjemautkast beholdes i samme nettleserfane ved navigering, uten lagring av samtykke eller frakttoken.

Prisgrunnlag på produktsider, presisert 25. oktober 2026: Mobil bruker samme kompakte grønne brukslinje og «Endre»-knapp som katalogen, også inne på lounge-/pakkeprodukter og sofabygger. Den samme prisgrunnlagsvelgeren og engangsforklaringen gjenbrukes; valget oppdaterer samme leiepriser og huskes på tvers av sidene. Desktopvisning og kurv beholdes.

Periodebaserte tilvalg, presisert av eier 25. oktober 2026: Ikke presenter 1/7/30-dagers summer med tilvalg som døgn-/uke-/månedspriser. Produktets prisrute forblir uten tilvalg. Under valgene vises valgte tilvalg separat, med samlet tilvalgspris for valgt antall per påbegynte 30 dager. Før datovalg vises ingen samlet tariff som kan tolkes som en døgnpris. Etter datovalg vises beregnet leiesum for hele perioden, der hvert tilvalg belastes én gang per påbegynte 30 dager. Gjelder både enkeltprodukter og ferdige pakker. Eksisterende beregning per varelinje, prisforespørsler og typografi beholdes. Denne presiseringen erstatter tidligere tre prisruter inkludert tilvalg under valgene.

Pris for valgt leieperiode, presisert av eier 25. oktober 2026: Beløpet bruker samme størrelse og vekt som ordinære priser i samme komponent: 13 px / 500 som standard, 11 px på mobile katalog-/forsidekort og 12 px på mobile produktdetaljer. Beløp og kr holdes samlet. Ingen stor eller fet særskilt periodetotal. Gjeldende beregning og øvrig utforming beholdes. Visuelt kontrollert sammen med forside på 320/390/1280 px; bevisst CSS-fingeravtrykk oppdatert kun for denne bestilte endringen.

Rettelser etter sluttkontroll 25. oktober 2026: Regelen om separate periodebaserte tilvalg gjelder også sofabyggeren og tilpassede pakker i kurven. Døgn-/uke-/månedstariffer gjelder møblene; tilvalgene står separat per påbegynte 30 dager. Etter datovalg vises én samlet pris for hele perioden. Ved direkte kjøp av en ferdig pakke følger tilknyttede tilvalg med som kjøpslinjer med egne kjøpsverdier, uten leiedatoer eller leievilkår. Ukjent kjøpspris avklares. Godkjente prisfonter, bildekolonner og bekreftelseskomponenter gjenbrukes; ingen stilark eller designreferanser er endret.

Skjemavalg ved navigering: Anledning, stylistvalg med notater og rabattkode beholdes i samme nettleserfane. Leie og kjøp har separate utkast og rabattkoder. Rabattbeløp lagres ikke; koden kontrolleres på nytt mot serverens gjeldende utvalg. Samtykke og frakttoken lagres ikke i utkastet. Vellykket innsending rydder det aktuelle utkastet og rabattkoden.

Godkjent designjustering 25. oktober 2026: Anbefalingskort («Se lignende alternativer» og kjøpsanbefalinger) bruker vanlig prisfont, 13 px / 500 på desktop og 11 px / 500 på mobil opptil 640 px. Rett før sendeknappen vises en kompakt oppsummering av leie/kjøp, gyldig rabatt og valgt transport. Beløp bruker 13 px / 500. Manglende datoer, pris på forespørsel og ukjent transport vises uttrykkelig; ingen misvisende komplett sum. Endret adresse, kurv eller rabattkode må aldri beholde en utdatert sum. Valgfritt kjøp etter leie inngår ikke i leiesummen.
