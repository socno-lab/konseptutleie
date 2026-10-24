# Mottaksbekreftelser

Leie og kjøp bruker eksisterende `/api/submissions`, Hostinger Mail og den eksisterende mottakeradressen `post@konseptuell.no`. Avsender og kundens Reply-To er samme domeneadresse; intern Reply-To er kundens validerte adresse. Ingen nøkler ligger i klienten.

## Lagring og sending

- `ku_enquiries` lagrer et uforanderlig øyeblikksbilde med serverberegnede priser, rabatt, bekreftet egen frakttariff og praktiske opplysninger. Begge e-postvariantene bygges fra dette øyeblikksbildet.
- `ku_enquiry_mail` har egen tilstand og atomisk sendelås per referanse og mottaker. Allerede vellykket mottaker sendes ikke igjen ved nytt innsendingforsøk eller prosessrestart.
- Skjemaet beholder referanse og kontrollsum i fanens sessionStorage, ikke personopplysninger. Endret innhold blir en ny forespørsel. Kurven beholdes ved feil, og tømmes først når serveren har bekreftet registrering.
- Køen starter ved mottak og kontrolleres hvert minutt. Kjente SMTP-feil forsøkes igjen etter fem minutter, maksimalt fem forsøk. Bare den feilede mottakeren forsøkes igjen.
- SMTP kan ikke garantere eksakt én levering når forbindelsen brytes etter DATA. Slike feil, og utløpte sendelåser etter prosesskrasj, blir `uncertain` og sendes ikke automatisk igjen. Admin → E-poststatus viser dem og har eksplisitt varsel før nytt forsøk. Meldings-ID er stabil per mottaker.
- SMTP-aksept betyr ikke at e-posten nådde innboksen. Kontroller SPF/DKIM/DMARC og eventuelle returer i Hostinger Mail. Løsningen setter ikke opp eller endrer DNS.
- Forespørsel og køstatus slettes automatisk etter 30 dager, også om SMTP er deaktivert, så lenge appen kjører og databasen er tilgjengelig. Dette er opplyst i personvern. Jobben sletter ikke kopier i e-postsystem eller eksterne sikkerhetskopier. Inngåtte avtaler og regnskapsopplysninger håndteres videre i virksomhetens ordinære systemer.
- Eksisterende katalog og miljøvariabler endres ikke av migreringen. Den oppretter bare nye tabeller. Eksisterende `ku_submissions` beholdes for gamle referanser.

## Priser og frakt

Eksisterende pris-, pakke-, tilvalg- og rabattmodeller brukes på serveren. Alle nåværende priser er inkl. mva. Ukjent pris eller uberegnet frakt gir ingen oppdiktet total. Egentransport gir 0 kr. Google-estimatet returnerer en signert kortlivet kvittering på Konseptuells egen tariff; innsendingen verifiserer denne uten et nytt Google-kall. Adresse, gjeldende tariff, faktisk mannskapsbehov og kapasitetsregler kontrolleres på serveren. En utløpt eller ugyldig kvittering gir «avklares i tilbudet».

## Konfigurasjon

Eksisterende `SMTP_USER=post@konseptuell.no`, `SMTP_PASS`, databaseinnstillinger og `APP_ORIGIN=https://konseptuell.no` brukes. SMTP standard: smtp.hostinger.com, 465, TLS 1.2+. Alternativt 587 med STARTTLS via SMTP_PORT. GOOGLE_MAPS_API_KEY brukes som før; ingen ekstra Google-kall ved innsending. Ingen nye hemmeligheter kreves.

## Kontroll og forhåndsvisning

`node --test checks/*.test.mjs` kjører uten reelle e-postmottakere. `node previews/enquiry-emails.mjs [utmappe]` genererer fire HTML-, tekst- og .eml-filer med fiktive data, med Nodemailers lokale stream-transport. Ingen SMTP-forbindelse opprettes. Produktbilder hentes bare fra egne katalogressurser og konverteres til små JPEG-miniatyrer med sharp (begrenset pikselantall og behandlingstid); WebP sendes ikke som inline-bilde til eldre Outlook. Malen bruker tabelloppsett, inline CSS, innebygd CID-logo og Outlooks MSO-ramme. Visuelt kontrollert i nettleser på desktop og 320/375 px. Faktisk rendering i Gmail, Apple Mail og Outlook må kontrolleres i de respektive klientene; nettleserprøven er ikke en slik klienttest.
