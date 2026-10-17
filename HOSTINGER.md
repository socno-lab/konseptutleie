# Hostinger

## Anbefalt abonnement

Velg Business med Node.js Web Apps, eller en annen plan som uttrykkelig inkluderer Node.js og GitHub-deploy. Dette prosjektet bruker Node, ikke WordPress eller PHP. Veiledning: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

## Oppsett for forhåndsvisning

- Repository: `socno-lab/konseptutleie`
- Gren: `export/site-v59`
- Prosjektrot: repositoryets rot
- Runtime: Node.js 22.13 eller nyere
- Installer: `npm ci`
- Bygg: `npm run build`
- Start: `npm start`
- Port: serveren bruker miljøvariabelen `PORT` som hostingmiljøet setter
- Serverbasert app; ingen statisk output-mappe kreves av denne implementasjonen

Denne eksporten er testet lokalt. Den er ikke testet eller satt opp i en Hostinger-konto. Kontroller at hostingoppsettet støtter en egendefinert Node-server før abonnement/deploy.

## Gjenstår før selvstendig drift

1. Legg katalogen i en varig database, for eksempel MySQL, og importer `data/catalog-export-2026-10-17.json`. Behold ID-er og revisjonskontroll.
2. Implementer servervalidert administratorinnlogging, sikre sesjoner og origin-/CSRF-kontroll før administrasjon aktiveres. Ikke stol på Sites-identitetsheadere på en direkte eksponert server.
3. Tilpass administratorens API til den nye databasen. Forretningsregler og tidligere API finnes i `reference/sites/`.
4. Konfigurer e-post eller annen mottaksløsning dersom forespørsler skal sendes til virksomheten. I dag lastes de bare ned.
5. Kontroller endelige priser, vilkår, tilgjengelighetsrutiner, domene og HTTPS. Ta databasebackup og test at adminendringer overlever omstart og deploy.

Hemmelige verdier legges i hostingmiljøets variabler, aldri i GitHub. Den publiserte Sites-versjonen beholdes til migreringen er godkjent.
