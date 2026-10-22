# Hostinger

## GitHub-deploy

Repository `socno-lab/konseptutleie`, gren `main`, framework Other, Node 22.x, prosjektrot `./`, build `npm run build`, entry `server.mjs`. Ingen statisk output-mappe. Inngangsfilen må starte serveren også når Hostinger importerer den.

## Miljøvariabler

I Hostinger → Environment variables, aktiver med Apply changes:

| Variabel | Innhold |
| --- | --- |
| DB_HOST | Databasevert, normalt localhost på dette webhotellet |
| DB_NAME | Fullt databasenavn |
| DB_USER | Fullt brukernavn, med korrekt store/små bokstaver |
| DB_PASSWORD | Databasepassord |
| ADMIN_SETUP_KEY | Tilfeldig engangsnøkkel, minst 24 tegn |
| APP_ORIGIN | Valgfri eksakt HTTPS-adresse uten avsluttende skråstrek. Standard https://blueviolet-ant-597153.hostingersite.com |
| DB_PORT | Valgfri, standard 3306 |
| DB_SSL | true hvis databasen krever TLS med gyldig sertifikat |

Ved domenebytte oppdateres APP_ORIGIN. Hostinger setter PORT. Hemmeligheter skal aldri i GitHub, nettadresser eller chat.

## Første administrator

1. Åpne `/admin` etter deploy.
2. Eieren skriver selv engangsnøkkel og e-post og velger passord på 12–128 tegn.
3. Opprett administrator. Nøkkelen virker bare før første administrator er opprettet og kan deretter fjernes fra miljøvariablene.

Passord hashes med scrypt. HttpOnly/SameSite-cookies, åtte timers sesjoner, begrensede innloggingsforsøk og origin-kontroll beskytter administrasjonen. Sites-identitetsheadere gir ingen tilgang. Denne versjonen har én administratorkonto. En aktiv sesjon kan vise registrert e-post og sette nytt passord under Konto og innlogging. Andre sesjoner avsluttes. Hvis alle sesjoner er utløpt og passordet er tapt, må eieren gjenopprette tilgang via driftsmiljøet.

## Lagring og backup

Tabellene med prefiks `ku_` opprettes automatisk ved første databaseforespørsel. Eksporten importeres bare når katalogen mangler. Produkt-ID-er beholdes. Nye bilder lagres i databasen og overlever deploy sammen med produktendringer.

Ta regelmessig backup av hele MySQL-databasen, inkludert `ku_media`. Katalognedlasting fra admin inkluderer ikke selve bildefilene. Kontroller lagring etter omstart/deploy før kundelansering.

Avklar endelige priser, vilkår, tilgjengelighet og mottak av forespørsler. Forespørsler sendes via SMTP når SMTP_PASS er konfigurert. Uten e-postinnstillinger svarer API-et med en tydelig feil; kunden får ikke falsk sendebekreftelse.

## E-post til post@konseptuell.no

Hostinger Mail: SMTP_HOST=smtp.hostinger.com, SMTP_PORT=465, SMTP_USER=post@konseptuell.no, SMTP_PASS=postkassens passord (hemmelig miljøvariabel). Standard host/port/bruker er allerede satt i kode. Legg aldri passord i GitHub eller chat. Apply changes/redeploy etter endring. TLS-sertifikater valideres.

/api/submissions sender kun til post@konseptuell.no. Kundens validerte adresse brukes som Reply-To, aldri som fri mottaker. Forespørselen er uforpliktende og mottar en referanse. Dobbeltklikk/gjentatt innsending med samme id sender ikke duplikat. Databasen begrenser til 3 innsendinger per socket-klient per 15-minuttersvindu, 30 globalt/time og 100/dag; reverse proxy kan gi en strengere delt klientgrense. Serveren lagrer bare referanse, kontrollsum, status og tidspunkt, maksimalt 30 dager. Ved usikkert SMTP-resultat sendes ikke automatisk på nytt; kontakt kan avklare med referansen. Ingen kundeautoresponder: unngår at skjemaet kan brukes til å sende spam til vilkårlige mottakere.

Tilbud/ordrebekreftelse, gjeldende vilkår, angreskjema og Vipps-betalingslenke sendes manuelt ved oppfølging. En mottaksbekreftelse i skjemaet er ingen bindende avtale eller automatisk betaling.
