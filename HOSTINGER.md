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

`/api/submissions` registrerer en uforpliktende forespørsel med referanse og legger én intern mottaksbekreftelse til `post@konseptuell.no` og én kundekopi til skjemaets validerte e-postadresse i separate, varige køer. Avsender er alltid `post@konseptuell.no`; intern Reply-To er kundens adresse, mens kundekopiens Reply-To er `post@konseptuell.no`. Kundeadressen er ikke verifisert som eiet av innsenderen, så grensene mot misbruk må beholdes. Databasen begrenser nye forespørsler til 3 per socket-klient per 15-minuttersvindu, 30 globalt/time og 100/dag; reverse proxy kan gi en strengere delt klientgrense.

Serveren lagrer et uforanderlig øyeblikksbilde med kontaktopplysninger, produkter, serverberegnede priser, periode, tilvalg og transport, samt kontrollsum og separat sendestatus for hver mottaker. Disse databasepostene slettes etter 30 dager. Slettejobben kjører også når SMTP er deaktivert, men krever at appen kjører og databasen er tilgjengelig. E-post og eksterne sikkerhetskopier slettes ikke av denne jobben. Dobbeltklikk/gjentatt innsending med samme id og innhold gjenbruker den registrerte forespørselen. Kjente SMTP-feil forsøkes igjen; usikkert resultat etter DATA eller utløpt sendelås krever manuell kontroll under Admin → E-poststatus før eventuell ny sending. Registrert sending eller SMTP-aksept er ingen garanti for levering i innboksen. Se [EMAIL-RECEIPTS.md](EMAIL-RECEIPTS.md).

Tilbud/ordrebekreftelse, gjeldende vilkår, angreskjema og Vipps-betalingslenke sendes manuelt ved oppfølging. En mottaksbekreftelse i skjemaet eller på e-post er ingen bindende avtale, automatisk betaling eller reservasjon av datoer/lager.
