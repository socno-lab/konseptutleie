# Godkjent uttrykk – Konseptuell

Brukeren godkjente gjeldende uttrykk 23. oktober 2026 og ba om at det låses mot utilsiktede endringer.

## Bevar som standard

- Forsidens synlige overskrift: «Hva skal du leie til?» med samme fremheving og innledning som i HTML-malen.
- Grønn/hvit profil, logo, typografi, luft og kortoppsett.
- Bruksområdekort: tre kolonner på desktop og to på mobil. Bildeforhold 1,6 på desktop og 1,15 på mobil; responsiv høyde. Ved 390 px skjermbredde er bildefeltet omtrent 170 × 147 px, ikke 170 × 360 px.
- Produktbilder skal beholde egne responsive regler. Ikke legg samme faste bredde/høyde på alle bilder som et generelt SEO- eller ytelsestiltak.
- SEO må ikke skrive om synlig overskrift, endre bildenes utsnitt eller innføre en ny visuell profil. Metadata kan forbedres uten å endre kundens opplevelse.
- Produktutvalg, bilder og innhold som allerede styres fra admin kan fortsatt oppdateres der. Låsen skal ikke endre lager, priser, katalogdata eller bestillingsfunksjoner.

- Handlekurv: produkter og tjenester med bilde/ikon bruker samme navn-, pris- og informasjonstypografi. Fastpris skal ikke være større eller fetere enn vanlig leiepris. Bilder starter øverst på raden. Tilvalg forblir mindre, kompakte tillegg.

## Kontroll ved endringer

`node build.mjs` og testsuiten kontrollerer `reference/home-design-lock.json`. Låsen dekker delte stilark, hero før og etter serverrendering, forsiderendereren og bildemarkup i leie/kjøp. Fordi stilark er delt, kan også en endring på en annen side utløse kontrollen. Dette er et signal om visuell gjennomgang, ikke en grunn til å omgå kontrollen.

Når kontrollen feiler:
1. Finn den konkrete forskjellen. Ikke oppdater referansen automatisk for å få grønt bygg.
2. Ved utilsiktet endring: rett tilbake til godkjent uttrykk.
3. Ved en endring som brukeren har bedt om, eller som bare gjelder en annen side: kontroller den berørte funksjonen og sammenlign forsiden med referansebildene på mobil (390 px), smal mobil (320 px) og desktop (1280 px). Ingen horisontal scrolling, strekte bilder eller endrede utsnitt.
4. En bevisst referanseoppdatering skal dokumentere hvorfor endringen er tillatt og hva som er kontrollert. Generelle ønsker om SEO, hastighet eller opprydding er ikke en bestilling av nytt design.

Referansebilder ligger i `reference/home-mobile-approved-2026-10-23.png` og `reference/home-desktop-approved-2026-10-23.png`.

Låsen er en regresjonskontroll, ikke tilgangskontroll eller en garanti mot alle mulige visuelle feil. Nye komponenter og uvanlige CSS-overstyringer må også vurderes visuelt.
