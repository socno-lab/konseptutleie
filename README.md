# Konsept Utleie

Møbelutleie med katalog, størrelsesvalg, modulsofaer, tekstiltilvalg, bildevegg og forespørselskurv. Eksportert fra Sites v59 og tilpasset Node.js-drift på Hostinger.

## Kjør

Node.js 22.13 eller nyere.

```sh
npm ci
npm run build
npm test
npm start
```

Serveren bruker PORT fra hostingmiljøet, ellers 3000. Se [HOSTINGER.md](HOSTINGER.md) for oppsett.

## Administrasjon

Åpne `/admin`. Produkter, beholdning, priser, bildevalg, opplastede bildefiler og innlogging lagres i MySQL. Katalogen importeres én gang. Deploy overskriver ikke adminendringer.

- **Produkter:** nye produkter starter som vanlige enkeltprodukter. Velg modul eller pakke bare når relevant. Hovedbilde og opptil 12 galleribilder kan velges, byttes og sorteres.
- **Bildevegger:** hvert oppsett har egen pris og skisse. Samme bildevegggruppe samler oppsettene i én velger. Opprett flere oppsett og rediger rammenes plassering. Felles forsidebilde følger gruppen. Fjern «Vis på nettsiden» for å skjule et oppsett.
- **Bildebibliotek:** medfølgende og opplastede bilder, filnavn og hvilke produkter som bruker dem. JPG, PNG, WebP eller AVIF, maks 8 MB. Fjerning fra produktet beholder filen i biblioteket.

Lagre produktet for å publisere. Revisjonskontroll beskytter samtidige endringer. Katalognedlasting inneholder produktdata og bildeadresser; selve bildene sikkerhetskopieres via databasen.

Uten database er eksportkatalogen skrivebeskyttet. Konfigurert database som ikke svarer gir feilmelding, uten å vise utdaterte eksportdata som gjeldende lager.

Forespørsler lastes fortsatt ned som tekstfil. E-post, betaling og datoreservasjoner er ikke implementert. Prisene er foreløpige eksempelpriser.

`public/` inneholder frontend og bilder, `server/` database, innlogging og validering, `app-server.mjs` HTTP-ruter og `server.mjs` oppstartspunkt. `reference/sites/` er historisk forretningskode som ikke kjøres. Ingen passord, tokens eller miljøfiler skal i GitHub.

## Bruksområder

Forsiden og velgeren over katalogen støtter Boligsalg, Messe, Event og Vis alle. Valget kombineres med produktkategori og søk. Det lagres i nettadressen og sessionStorage; tilbake/frem gjenoppretter også kategori og søk. Relevante aktive pakker vises først. Kurv, tilvalg og produktdialoger bruker fortsatt hele katalogen.

I admin velges flere bruksområder per produkt, pakke eller bildeveggoppsett. Ingen avkrysninger betyr kun Vis alle. Eksisterende kjente produkter får en første kategorisering via stabile ID-er; manuelt lagrede valg, også tomme valg, går alltid foran standarden. Nye ukjente produkter må vurderes i admin. Lager, bilder, priser og arkivering endres ikke av denne migreringen.

Første vurdering: stylingsenger, sengeoppredning og de eikefargede spisebordene med duk er Boligsalg; ståbord og barkrakker er Messe/Event; utemoduler er Boligsalg/Event. Innendørs sittemøbler, bord, dekor, planter og bildevegger kan brukes i alle tre. De 11 eldre arkiverte enkeltproduktene uten tydelig vurdert tilhørighet har ingen bruksområder og må vurderes før eventuell aktivering. Alle tre eksisterende ferdigpakker er arkivert; de må gjennomgås og aktiveres av eier før de vises for kunder. Ingen pakker eller priser er opprettet for denne funksjonen.

## Konto og innlogging

En aktiv innlogging kan åpne Konto og innlogging for å se kontoens e-postadresse og sette nytt passord. Endringen avslutter alle andre sesjoner atomisk og gir den aktive nettleseren en ny sesjon. Katalog og bilder endres ikke. Passordendringen krever en gyldig sesjon og korrekt origin. Passord legges aldri i URL, logger eller GitHub.

Tilvalg i admin velges med søkbare avkrysningsbokser. «Valgte tilvalg» vises separat, med Fjern-knapper og varsel for skjulte produkter. Valgene beholdes ved søk og publiseres først ved lagring. «Fast innhold i pakken» viser hva som alltid følger med. Anbefalte ferdigpakker har en egen avkrysningsliste.

## Papirkurv

«Slett produkt» flytter oppføringen til papirkurven og fjerner den fra nettsiden. Slettingen kan angres; ID, bilder og produktdata beholdes. Produkter som brukes av andre oppføringer kan ikke slettes før koblingene er fjernet. Serveren håndhever dette og revisjonskontroll. Gjenoppretting viser ikke produktet automatisk: eier må aktivere det. Bildene beholdes i bildebiblioteket. «Vis på nettsiden» er fortsatt en separat synlighetsinnstilling.

Ferdigpakker har egen Pakker-fane i administrasjonen. Produkter viser enkeltprodukter og moduler; Bildevegger viser bildeveggoppsett. Opprett ny pakke direkte fra Pakker med «+ Ny pakke». Skjulte pakker beholdes i pakkeoversikten med tydelig status.

Bildebiblioteket støtter sletting til papirkurv og gjenoppretting. Bildekoblinger vises med klikkbare produktnavn; bilder i bruk kan ikke flyttes til papirkurven. Bildefilene beholdes ved denne reversible slettingen, også for medfølgende bilder i GitHub. Produktbilder i admin og kundens produktdialog kan åpnes i stor visning med bla-knapper, piltaster og Escape.

Under Produkter i admin finnes kategorifiltre med antall per kategori. De kombineres med søk og inkluderer også skjulte produkter. Kategorivalget huskes i samme nettleserøkt. Nytt produkt opprettes med valgt kategori. Pakker og bildeveggoppsett beholdes i egne faner.
