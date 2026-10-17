# Konsept Utleie

Nettside for møbelutleie med katalog, størrelsesvalg, modulsofaer, tekstiltilvalg, bildevegg og forespørselskurv.

Eksportert fra Sites-versjon 59, 17. oktober 2026. Design, frontend, produktbilder og 54 katalogoppføringer følger med. Intern Sites-/connector-infrastruktur er utelatt. Den eksisterende Sites-nettsiden er ikke endret.

## Kjør lokalt eller på Node.js-hosting

Node.js >=22.13.0. Ingen eksterne runtime-avhengigheter.

```sh
npm ci
npm run build
npm test
npm start
```

Serveren lytter på `PORT` fra hostingmiljøet, ellers port 3000. `npm run build` kontrollerer katalogen og lokale bildelenker; løsningen trenger ikke kompilering.

## Status før lansering

**Node-serveren viser katalogen fra eksportfilen. Administratorlagring er ikke aktivert.** `/admin` og `/api/admin/*` svarer 503. Innloggingsheadere gir ikke administratortilgang. Den nåværende katalogen lastes fra `data/catalog-export-2026-10-17.json` ved oppstart og kan ikke endres via nettstedet.

Forespørsler kan lastes ned som tekstfil. De sendes ikke på e-post, og nettsiden tar ikke betaling eller reserverer datoer. Prisene er foreløpige eksempelpriser. Eksisterende informasjon om prøveversjonen er beholdt.

Se [HOSTINGER.md](HOSTINGER.md) for oppsett og gjenstående arbeid. Domenet bør ikke lanseres til kunder før administrasjon, forespørselshåndtering og priser er avklart.

## Innhold

- `public/`: frontend og produktbilder.
- `server.mjs`: Node HTTP-server med skrivebeskyttet katalog-API.
- `data/catalog-export-2026-10-17.json`: 54 oppføringer, inkludert arkiverte produkter og beholdning.
- `checks/`: tester for priser, beholdning, moduler, tilvalg og Node-serveren. Historiske testprodukter ligger i `checks/fixtures/`.
- `reference/sites/`: forretningskode og administratorgrensesnitt fra Sites til støtte for videre migrering. Dette er referansekode; den lastes ikke av Node-serveren.

Ingen passord, GitHub-tokens eller miljøfiler er inkludert. Administratoradresser er fjernet fra offentlig kode. Se [SOURCE.md](SOURCE.md).
