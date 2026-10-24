# Drift og lanseringskontroll

Denne filen er en prosedyre. Den dokumenterer ikke at backup, gjenoppretting, DNS, leveringsdyktighet eller en produksjonskontroll allerede er utført. Fyll ut kontrolljournalen nedenfor når kontrollen faktisk gjennomføres. Hold passord, SQL-dumper og kundedata utenfor GitHub, logger og skjermbilder.

## Kontroller uten produksjonsendringer

`node scripts/preflight.mjs` kontrollerer bare Node-kravet og bruker ikke nettverket. `node scripts/preflight.mjs --check-env` kontrollerer konfigurasjonens form og tilstedeværelse, uten å skrive ut verdier eller koble til database, Google eller SMTP. Kjør dette i et sikkert driftsmiljø der variablene allerede er tilgjengelige; ikke lim hemmeligheter inn i kommandohistorikken.

`node scripts/preflight.mjs --public-health https://konseptuell.no` er et valgfritt, offentlig lesesjekk med timeout mot forsiden og tre API-status/katalogruter. Det bruker kun HEAD/GET, skriver kun status/latens og kontrollerte felt, og sender verken inn forespørsler eller e-post. Funksjonsstatus betyr at konfigurasjonen er aktiv, ikke at faktisk e-post eller Google virker. En slik kontroll erstatter ikke vanlig nettlesertest. Kjør den bare når du ønsker nettverkskontroll; den starter ingen periodisk overvåking.

Før en godkjent publisering: `npm ci`, `npm test`, `npm run build` og `npm audit --omit=dev --audit-level=high`. Bygg skal stoppe ved utilsiktet designendring. Ikke oppdater designreferanser for å få grønt bygg uten visuell gjennomgang. Avhengighetssjekken krever kontakt med npm og viser kjente advisories, ikke en garanti mot alle sårbarheter.

## Kontinuerlig kildekontroll

`.github/workflows/verify.yml` kjører installasjon fra lockfil, tester, bygg og npm-audit ved pull request, push til main eller manuell start. Den har kun read-tilgang til kildekode, ingen produksjonshemmeligheter eller deploytrinn, og checkout lagrer ikke token i Git-konfigurasjonen. GitHub Actions må være aktivert av eier, og kontrollen bør settes som obligatorisk branch-regel før main brukes til publisering. Eksisterende automatisk Hostinger-deploy blir ikke stoppet av denne filen alene.

Handlingene er låst til verifiserte fulle commit-ID-er for [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) og [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0). Vurder nyere versjoner og oppdater pinning etter kontroll, ikke automatisk uten gjennomgang. Node 22 er valgt for å følge dokumentert produksjonsoppsett.

## Backup før publisering eller datamigrering

1. Registrer tidspunkt, ansvarlig og nåværende produksjonscommit. Avklar hvor lenge eventuelle innsendelser eller adminendringer må stanses for en konsistent eksport.
2. Ta en full, konsistent MySQL-backup av alle `ku_`-tabeller, inkludert `ku_catalog`, `ku_site_settings`, `ku_discounts`, `ku_media`, bilde-/papirkurvstatus og forespørsels-/sendekøtabellene. Admins katalogeksport inkluderer ikke bildefilene i `ku_media` og er ikke en full backup.
3. Bruk leverandørens sikre backupfunksjon eller et autorisert databaseverktøy som håndterer transaksjonskonsistens. Legg ikke passord på kommandolinjen. Krypter eksporten, begrens tilgang og oppbevar den utenfor repository og offentlige webmapper. Registrer backup-ID, størrelse, kontrollsum og gjeldende oppbevarings-/slettefrist, uten personopplysninger.
4. Kontroller at eksporten er fullført og at bildebiblioteket inngår. En nedlastet fil eller grønn backupstatus beviser ikke at den kan gjenopprettes.

## Gjenopprettingstest: bare isolert, ikke-produktivt miljø

En gjenoppretting av produksjonsbackup krever eksplisitt godkjenning av databehandlingen og valgt testmiljø. Bruk syntetiske data som første test. Produksjonsdata skal ikke kopieres til en utviklers maskin, GitHub Actions eller et uavklart miljø.

1. Opprett en separat testdatabase og en testbruker med tilgang bare til denne databasen. Den skal ikke kunne skrive til eller lese fra produksjonsdatabasen. Bruk separat testopprinnelse.
2. Fjern SMTP_PASS og GOOGLE_MAPS_API_KEY fra testprosessen, blokker utgående SMTP/Google i testmiljøet, og start aldri med produksjonsmiljøfilen. Dette er særlig viktig fordi e-postkøen begynner å behandles ved oppstart når SMTP er aktivert.
3. Importer kun godkjent backup i den isolerte databasen. Bekreft schema, produkt-/bildeforekomster og at egne `ku_media`-bilder kan vises. Bekreft at papirkurv og permanent sletting er konsistente. Kontroller private tabellers antall/tilstand uten å kopiere innhold til rapporten.
4. Start appen mot testdatabasen uten SMTP. Kontroller leie/kjøp med syntetiske kontaktdata, priser, tilvalg, transport, lagring og admininnlogging med en egen testkonto. E-postmalene testes med lokale stream-/fake-transporter, ikke reell SMTP. Ingen gamle køjobber må sendes.
5. Loggfør om app/data/bilder fungerte, tidsbruk, avvik og hva testen faktisk dekket. Slett den midlertidige databasen og eventuelle lokale eksportfiler sikkert etter kontrollen, i tråd med avtalt retention. En vellykket test er bevis for denne konkrete backupen og versjonen, ikke alle fremtidige sikkerhetskopier.

## Tilbakerulling

Ved kodefeil: registrer hendelsestidspunkt og commit, vurder å stoppe nye innsendelser kontrollert, og gjenopprett siste kjente fungerende kode via godkjent Hostinger/GitHub-prosess. Behold databasen når en ren koderullback er mulig. Ikke publiser automatisk fra denne prosedyren.

Ved skade på data: ta først en sikret kopi av nåværende tilstand og avklar nye katalogendringer og innsendelser siden backupen. Databasegjenoppretting kan miste disse opplysningene, tilbakestille sesjoner og gjøre tidligere sendte e-poster til usendte jobber. Derfor kreves konkret godkjenning, sammenligning og en plan for å bevare nye forespørsler før produksjonsrestore. Deaktiver SMTP før en godkjent restore; kontroller og avstem e-postkøen mot faktisk tidligere sending før SMTP aktiveres igjen. Ikke sett gamle køposter til `pending` samlet. Konto/sesjoner fra en gammel backup må vurderes og eventuelt tilbakekalles før ny åpning.

Etter godkjent rollback/restore: kjør offentlig lesesjekk og praktiske kontroller av katalog, bilder, innlogging og syntetisk forespørsel i et avtalt miljø. Noter hva som er bekreftet, og hva som fortsatt venter. En vellykket HTTP-status betyr ikke at e-post er levert.

## E-postkø og oppfølging

Se Admin → E-poststatus etter publisering og ved mistanke om manglende mottak. `pending` forsøkes igjen ved kjente SMTP-feil; `sent` betyr SMTP-aksept, ikke innbokslevering. `failed` har brukt opp automatiske forsøk. `uncertain` kan allerede være levert og sendes ikke automatisk på nytt. Kontroller referanse, mottakerkanal og postkasse/SMTP-logg før en godkjent, enkeltvis retry; kunden kan ellers få duplikat.

Forespørsler og køstatus slettes fra appens database etter 30 dager mens app/database kjører, uavhengig av aktiv SMTP. E-post, hostingleverandørens logger og backupkopier følger ikke automatisk denne jobben. Eier må fastsette tilgang, lagringstid og sletting også der, samt en prosess for innsyn/sletting. Ikke bruk reelle kundedata som permanente testfixtures.

## Forhold som må bekreftes eksternt

Eier/drift må selv dokumentere faktisk SPF/DKIM/DMARC og returpost, leveringsprøve i relevante postklienter, Hostinger-backup og en gjennomført restoretest, TLS/proxy-/databaseplassering og logger, konto-/tilgangsrutiner og databehandler-/overføringsgrunnlag. Google Cloud må ha passende API-/nøkkelrestriksjoner, kvoter og kostnadsvarsler. Lokale kilde- og konfigurasjonstester gjør ingen slike konto- eller DNS-endringer og beviser ikke leverandørkonfigurasjonen.

## Kontrolljournal

| Felt | Fylles ut ved reell kontroll |
|---|---|
| Dato og ansvarlig | Ikke gjennomført i denne kodeendringen |
| Miljø og commit | |
| Backup-ID, kontrollsum og slettefrist | Ingen dump eller kundedata i journalen |
| Isolert testmiljø og datatillatelse | |
| Utgående SMTP/Google blokkert | |
| Katalog, ku_media og kø kontrollert | |
| Restore/rollback-resultat og tidsbruk | |
| E-postlevering, DNS og leverandørkontroller | |
| Avvik, gjenstående arbeid og godkjenning | |
