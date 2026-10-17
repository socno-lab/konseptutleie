# Proveniens

- Kilde: https://konsept-utleie.astutechick6.chatgpt.site/?v=59#utvalg
- Sites-versjon: 59
- Opprinnelig kildecommit: `bbb0f6d5bf035736fc67dc1680c1eabf3fffaa38`
- Eksportdato: 17. oktober 2026
- Mål: `socno-lab/konseptutleie`, gren `export/site-v59`

Frontend og bilder er bevart. Datakopien kommer fra administrasjonens katalogeksport og inneholder 54 oppføringer. Originalt produktregister er ikke endret.

Eksporten inkluderer en ny, avhengighetsfri Node-server for forhåndsvisning av katalogen. Tidligere administratorgrensesnitt og katalogens forretningskode er bevart under `reference/sites/`, men er ikke aktivert. Hardkodede administratoradresser er fjernet.

Intern Sites-/connector-runtime, lokal autentiseringssimulator, plattformens byggeplugin, ubrukte generiske starterkomponenter, miljøfiler, lokale databaser, Git-historikk, bygde filer og node_modules er utelatt. Fire interne plattformfiler ble avvist av automatisk sikkerhetskontroll og er ikke del av grenen. Den nye serveren importerer ikke disse filene.

En Hostinger-database, administratorinnlogging og innsending av forespørsler er ikke implementert i denne eksporten.
