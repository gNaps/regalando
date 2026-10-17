# Regalando

Liste di desideri da condividere con gli amici, mantenendo la sorpresa.

## Stato del progetto

L’app usa Next.js, Clerk e Convex. Sono implementati liste e desideri, modifica e rimozione dei regali, inviti tramite link, accesso con account o come ospite, prenotazione e annullamento, revoca e riabilitazione degli accessi. La landing e il servizio supportano italiano e inglese.

La prima versione viene preparata senza webhook attivi: i profili sono inizializzati e aggiornati dalla sessione verificata all’apertura del workspace; le richieste di cancellazione sono gestite manualmente dagli amministratori su Clerk e Convex, seguendo la [procedura di cancellazione](docs/MANUAL_DELETION.md). Il codice dei webhook resta predisposto per una futura attivazione, che non è un requisito di questo rilascio. Il flusso completo con account e browser reali distinti resta da verificare prima del rilascio. Riepilogo personale delle prenotazioni, upload e interfaccia degli avvisi sono ancora da completare.

- [Piano MVP](docs/MVP_PLAN.md)
- [Avanzamento e verifiche](docs/IMPLEMENTATION_STATUS.md)
- [Cancellazione manuale degli account](docs/MANUAL_DELETION.md)

## Avvio locale

Servono Node.js 22.12 o superiore e pnpm 12.11.2. `.nvmrc` seleziona Node 24.6.0, secondo la configurazione locale scelta.

```sh
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Aprire <http://localhost:3000>. La home `/` è una landing pubblica: «Accedi» apre `/sign-in`, «Crea la tua prima lista» apre `/sign-up`. Accesso e registrazione hanno una UI propria; Clerk gestisce credenziali, verifiche e sessioni. Se la configurazione dell’app è incompleta, viene mostrata `/setup`.

Se dopo `nvm use` il comando `pnpm` non è disponibile, installarlo per la versione Node selezionata:

```sh
nvm use
npm install --global pnpm@12.11.2
pnpm dev
```

Con nvm, i pacchetti globali appartengono alla versione Node selezionata. Il progetto usa pnpm anche per aggiungere o reinstallare dipendenze.

Gli script usano Webpack: Turbopack ha prodotto un errore nella compilazione CSS/font in questo ambiente anche dopo il tentativo fuori dalla sandbox. Non occorre scaricare font o immagini per visualizzare l'interfaccia: Geist, Lora Italic, il nastro scultoreo della UI e le illustrazioni SVG sono locali al repository. Lora aggiunge accenti serif ai titoli della landing e alla tagline. Il nastro viene servito con Next/Image; [asset, font e prompt di generazione](docs/VISUAL_ASSETS.md).

## Attivare Clerk e Convex

1. Creare/configurare un'app Clerk di sviluppo e attivare l'integrazione Convex seguendo la [guida ufficiale](https://docs.convex.dev/auth/clerk).
2. Aggiungere le variabili di `.env.example` a `.env.local`, conservando gli eventuali valori esistenti. Non commettere chiavi reali.
3. Selezionare un deployment Convex di sviluppo compatibile con il nuovo schema. Il deployment precedente usa Auth0 e può contenere documenti di prova con formato differente. Non applicare lo schema a dati esistenti senza verificarli; nessuna cancellazione o migrazione è stata eseguita.
4. Sul deployment Convex impostare `CLERK_JWT_ISSUER_DOMAIN` con il Frontend API URL Clerk. Il relativo `applicationID` è `convex`.
5. Eseguire `pnpm convex:dev` per distribuire esplicitamente le nuove funzioni nell'ambiente di sviluppo scelto. Il campo facoltativo `giftCount` delle liste richiede questa distribuzione; le liste esistenti senza contatore usano il conteggio diretto finché non ricevono un nuovo regalo.
6. Riavviare Next.js; in produzione occorre anche ricostruire il frontend quando cambiano le variabili pubbliche. Visitare `/lists` per provare autenticazione, inizializzazione profilo e creazione di liste reali.

Per questo rilascio non configurare endpoint Clerk o `CLERK_WEBHOOK_SIGNING_SECRET`. L’app funziona senza webhook; la procedura di cancellazione è manuale. La [guida ai webhook](docs/CLERK_WEBHOOKS.md) resta disponibile per un’integrazione futura.

Le pagine `/lists` e `/lists/[id]` usano il backend reale: elenco delle proprie liste, creazione, dettaglio e aggiunta di regali con prezzo, categoria e luoghi di acquisto.

Nel modulo **Nuovo regalo** si può incollare il link di un prodotto e premere **Compila dal sito**: l’action Node `productLinks.preview` scarica la pagina e legge i dati strutturati pubblicati dal negozio (JSON-LD `Product`, Open Graph, `<title>`), proponendo nome, descrizione, prezzo in euro e link ripulito dai parametri di tracciamento. I campi già scritti non vengono sovrascritti, la categoria resta «Altro» e tutto è modificabile prima del salvataggio; l’immagine del prodotto non viene ancora salvata. Il fetch accetta solo http/https, rifiuta host e indirizzi privati o locali anche dopo i redirect, legge al massimo 3 MB con timeout di cinque secondi ed è limitato a 30 richieste ogni dieci minuti per account (tabella `previewQuota`). Pagine protette da sistemi anti-bot o senza metadati degradano al solo link; per Amazon il titolo viene ricavato dallo slug dell’indirizzo. Liste, moduli e login condividono la palette nero/argento/oro. Se mancano le chiavi Clerk, `/lists` e le pagine di autenticazione portano a `/setup`; nessun login viene simulato nelle route reali.

Nel dettaglio della lista, **Invita amici** permette di creare un link, condividerlo dal dispositivo o copiarlo, rigenerarlo e disattivarlo. Gli amici aprono `/invite/[token]`, vedono titolo/proprietario/data e possono scegliere **Accedi come ospite** senza registrarsi, oppure entrare con un account. Con un account la lista resta in `/friends`; l’ospite deve conservare il link. La condivisione avviene tramite link: l’app non invia automaticamente email.

Gli ospiti non inseriscono un nome per consultare la lista. Il nome è obbligatorio alla prenotazione, viene controllato sul backend e mostrato agli altri partecipanti; la vista del proprietario resta senza scelte o nomi di prenotazione. Ogni regalo ammette una sola prenotazione attiva, condivisa tra account e ospiti. Conferma e annullamento sono collegati alle mutation reali.

Su scelta dell’utente, l’accesso ospite viene ricordato **solo nello stesso browser**, con una credenziale per invito in `localStorage` (`regalando:guest:`). Il backend conserva soltanto il digest; la credenziale non è aggiunta al link condiviso e non è esposta al proprietario o agli altri partecipanti. Il nome non identifica il titolare della prenotazione e non permette di annullarla. Cambiare browser/dispositivo o cancellare i dati del sito fa perdere questa possibilità; non elimina le prenotazioni sul server. La UI invita a conservare il link e spiega questo comportamento. Le modalità account e ospite restano distinte, senza trasferimento automatico delle scelte all’account.

**Regalo di gruppo.** È chi sceglie il regalo a decidere se dividerne la spesa: su un regalo libero può prenotarlo per sé oppure «proporre un regalo di gruppo»; chi lo ha prenotato da solo può aprirlo al gruppo in un secondo momento e, finché nessun altro ha aderito, tornare al regalo singolo. Gli altri amici aderiscono con una quota indicativa facoltativa e vedono il totale impegnato rispetto al prezzo. Non avviene alcun pagamento. Il proprietario non sa se un regalo è di gruppo: il documento del regalo non porta alcun flag e la sua vista non cambia.

**Note tra amici.** Nel dettaglio di ogni regalo, partecipanti e ospiti possono scrivere note brevi per coordinarsi (colore, chi compra, chi incarta). Le note sono leggibili solo tramite le query dei partecipanti e degli ospiti; il proprietario non dispone di alcuna funzione che le legga. Gli ospiti firmano la nota con un nome; ciascuno elimina solo le proprie. La rimozione di un partecipante o di un ospite cancella anche le sue note; le liste archiviate non accettano note nuove.

Il proprietario può rimuovere e riabilitare i partecipanti. Un partecipante rimosso non rientra tramite un nuovo link finché non viene riabilitato. La rimozione libera le eventuali prenotazioni di quella lista senza riportarne dettagli o conteggi al proprietario. Rigenerare/disattivare il link conserva gli accessi già attivi; le liste archiviate non accettano nuovi partecipanti.

Gli accessi ospite sono gestiti con etichette anonime, create all’ingresso e indipendenti dalla prenotazione, per non rivelare nomi o scelte al proprietario. La revoca blocca quella sessione e libera le sue prenotazioni. Un ospite anonimo può rientrare da un browser nuovo: il servizio non verifica l’identità reale di chi possiede il link. Gli endpoint ospite rifiutano il proprietario autenticato e gli account revocati/disabilitati; il servizio non può riconoscere un proprietario che si presenta come persona anonima senza account.

### Backend disponibile

- Schema tipizzato per utenti, liste, regali, partecipazioni, inviti, prenotazioni e avvisi.
- `profiles.ensure`: profilo derivato dalla sessione verificata, idempotente.
- `profiles.me`: dati minimi del proprio profilo.
- Webhook predisposto ma inattivo: `POST /clerk-users-webhook` sul dominio HTTP Convex. Richiede una firma valida e il Signing Secret; senza configurazione restituisce `503` senza scrivere. L’attivazione è rinviata.
- La mutation interna `clerk.deleteUser` può essere avviata manualmente da un amministratore per bloccare il profilo e pulire a lotti contenuti, accessi, prenotazioni e avvisi. Un record tecnico senza nome personale/avatar conserva l’identificativo Clerk per impedire la riattivazione da sessioni obsolete. L’account Clerk va eliminato separatamente; vedere la procedura operativa.
- `lists.create/getOwned/getOwnerDetail`: creazione e lettura di proprie liste.
- `lists.getParticipantDetail`: lettura per un partecipante attivo, con prenotazioni.
- `lists.getAccess/getJoined`: ruolo per il dettaglio e liste condivise con l’utente corrente.
- `inviteLinks.create/rotate`, `invites.getOwnerLink/disable`: gestione proprietario del link, con token casuale generato sul server e digest SHA-256. La scrittura è una mutation interna autenticata; la condivisione ripetuta mantiene il link attivo.
- `invites.preview/join`: anteprima pubblica minima e ingresso autenticato, idempotente, con controllo di revoche, stato account e archivio nella stessa transazione.
- `memberships.list/revoke/restore`: gestione proprietario degli accessi, senza identità Clerk, email o informazioni sulle prenotazioni nelle risposte.
- `guestAccess.create`, `guests.getDetail/listSessions/revoke/restore`: creazione server della credenziale ospite, lettura autorizzata tramite digest e gestione proprietario della sessione anonima.
- `reservations.reserveGift/cancelGift`, `reserveAsGuest/cancelAsGuest`: prenotazione atomica e annullamento del solo autore, con controlli su partecipazione/sessione, lista, regalo, versione, archivio e disponibilità. Nessun ID autore viene accettato dal browser. Sui regali di gruppo accettano `amountCents` facoltativo, ammettono più prenotazioni attive e una nuova conferma aggiorna la propria quota.
- `notes.listForGift/add/remove` e `notes.listAsGuest/addAsGuest/removeAsGuest`: note per regalo riservate a partecipanti e ospiti, massimo 500 caratteri e 100 note per regalo.
- `productLinks.preview`: anteprima dei dati prodotto da un link, con quota in `previewQuota.reserve`.
- `gifts.create`: creazione autorizzata con validazione di prezzo e negozi; aggiorna il contatore `giftCount` e `updatedAt` della lista.
- `gifts.update/remove`: modifica e rimozione riservate al proprietario della lista ricavata dal regalo; controllo versione, blocco su liste archiviate e validazione degli stessi campi della creazione. La rimozione nasconde il regalo e aggiorna il conteggio; gli eventuali riepiloghi di prenotazione vengono conservati e gli avvisi aggiornati internamente senza rivelare le scelte al proprietario.

Le funzioni proprietario e partecipante sono separate. Il proprietario non può invocare la query dei partecipanti; la sua vista non legge la tabella prenotazioni. Il precedente flag `booked` negli argomenti del client e l'endpoint non verificato `/syncUser` sono stati rimossi, insieme alle prove Auth0 e ai log di token.

Archiviazione e riattivazione sono disponibili nel dettaglio lista. Restano da completare l’area riepilogo prenotazioni e la visualizzazione degli avvisi. Gli avvisi sono già generati internamente quando cambia o viene rimosso un regalo prenotato.

## Verifiche

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm test:ui
```

Per Playwright serve Chromium installato. È possibile utilizzare Chrome già presente, ad esempio su macOS:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' pnpm test:e2e
```

Per eseguire i test browser senza usare il server già aperto, è possibile scegliere una porta e una cache separate:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:3100 REGALANDO_BUILD_DIR=.next/verify-dev pnpm test:e2e
```

I test backend usano Vitest e convex-test; `lib/domain.test.ts` copre formattazione di prezzi e date, plurali e link. I test browser avviano e arrestano il server automaticamente; verificano la landing pubblica, l’ingresso al workspace e il caricamento del login Clerk in italiano, su desktop e viewport mobili a 390/360 px. `pnpm test:ui` verifica i componenti reali del dettaglio lista in React StrictMode, con dati di test e persistenza simulata: apertura e chiusura delle finestre, focus, modulo regalo, errori, filtri, categorie e caricamento delle illustrazioni su desktop/mobile. La fixture usa Vite già fornito da Vitest e non aggiunge route di prova all’app. Gli screenshot finiscono nella cartella dei risultati di Playwright. Login con un account reale, flusso autenticato e concorrenza sul backend reale restano da verificare. Per il login in sviluppo usare `localhost`, coerente con i redirect Clerk.

Il login personalizzato copre password, codice email, recupero password e verifiche MFA/device trust. La registrazione rispetta i campi configurati sull’istanza e gestisce verifica email e completamento dei dati dopo Google. Il menu account è un componente proprio; «Gestisci account» apre il pannello Clerk per email, password e sicurezza. I test UI di questi flussi usano risposte simulate del SDK, senza inviare email o usare account reali; `lib/auth.test.ts` verifica i redirect ammessi e gli errori localizzati. Il ritorno OAuth passa da `/sso-callback`; eventuali requisiti di sicurezza della sessione passano da `/sign-in/tasks`.

```sh
pnpm convex:codegen
```

Rigenera i file in `convex/_generated` con il comando ufficiale, senza distribuire il codice del backend. Può richiedere accesso alla rete e alle credenziali Convex. Non modificare i file generati a mano.

I test webhook usano firme HMAC reali con una chiave esclusivamente di test: verificano firme mancanti/errate/scadute, alterazione del payload, retry, ordine degli eventi, precedenza sui JWT e cancellazione a lotti. Non creano utenti o endpoint sui servizi e non sostituiscono una consegna reale Clerk → Convex.

## Struttura

Il sito supporta italiano e inglese. La prima visita segue `Accept-Language` per le lingue supportate, con italiano come fallback. Il selettore IT/EN nell’intestazione salva la scelta nel cookie tecnico `regalando-locale` per un anno. Gli URL e i link di invito restano invariati; il cambio lingua aggiorna anche le pagine server senza perdere i dati dei moduli client.

Le stringhe italiane sono le chiavi del dizionario inglese in `lib/i18n/messages.en.json`. Nei componenti client usare `useI18n()`; nei componenti server usare `await getI18n()`. Il controllo di copertura in `lib/i18n.test.ts` segnala nuove chiavi o errori Convex privi di traduzione. I testi inseriti dagli utenti non vengono tradotti. Date e prezzi usano la lingua selezionata, mantenendo la valuta in euro; i componenti Clerk ricevono la localizzazione corrispondente.

I risultati dei test browser sono separati in `test-results/ui` e `test-results/e2e`, per consentire l’esecuzione contemporanea delle due suite.

```text
app/(auth)/           Login, registrazione e callback personalizzati
app/(invites)/        Anteprima pubblica e accettazione invito
app/components/auth/  UI di autenticazione con gli hook Clerk
app/(workspace)/      Primo flusso con backend reale
app/components/ui/    Brand, artwork, moduli e dialog condivisi
app/components/live/  Dashboard, dettaglio e profilo reali
app/providers/        Provider della lingua, Clerk e Convex
lib/i18n/             Dizionario delle traduzioni inglesi
convex/               Schema, funzioni, autorizzazioni e test
tests/e2e/            Percorsi critici su desktop e mobile
```

Schema e funzioni sono stati sincronizzati sul deployment Convex di sviluppo. Nessuna pubblicazione del frontend o distribuzione in produzione è stata eseguita. La cartella ignorata `.next.previous` conserva la cache del prototipo precedente; non contiene codice sorgente necessario all'app.

Inviti e partecipanti: test backend su permessi, anteprima, rotazione/disattivazione, ingresso ripetuto, revoca, riabilitazione e archivio. I test UI verificano condivisione/copia, conferme, errori, ritorno dal login e lettura dell’amico su desktop/mobile con persistenza simulata. Le route reali verificano anche l’invito pubblico invalido, `noindex` e `Referrer-Policy: no-referrer`; nessun invito reale viene spedito dai test. Resta da provare il percorso completo con due account reali distinti.

Accesso ospite e prenotazioni: test su nome obbligatorio, credenziali diverse con nomi uguali, retry/conflitti fra ospiti e account, annullamento del solo autore, revoca, archivio, versioni e risposte del proprietario identiche prima/dopo la scelta. I test browser coprono memoria locale, ritorno dal link, indisponibilità, conferma/annullamento, errori e gestione ospiti. Resta la prova completa con due browser distinti e prenotazioni simultanee sul deployment reale; i mock non sostituiscono quella verifica.

### Foto di liste e regali

Nei form di creazione e modifica di liste e regali, il proprietario può aggiungere, sostituire o rimuovere una foto. Dal dettaglio lista, **Modifica lista** permette di aggiornare titolo, descrizione, data, atmosfera e foto. Le immagini predefinite restano il fallback. Le foto sono visibili anche ad amici e ospiti autorizzati.

- Input JPG/PNG/WebP fino a 10 MiB; conversione nel browser in JPEG senza metadati, massimo 1200 px per lato e 250 KiB. La foto viene inviata solo al salvataggio del form.
- `listEditor.save` e `giftEditor.save` salvano dati e riferimento alla foto nella stessa transazione, evitando creazioni o modifiche parziali quando una quota viene rifiutata. `images.upload`, usato anche dalla scorciatoia nel dettaglio del regalo, riceve bytes limitati (nessuna URL di upload senza limite), verifica header JPEG, dimensioni e proprietà della lista, poi salva in Convex Storage. La mutation interna ricontrolla accesso e archivio e applica quote atomiche: 10 MiB per account, 800 MiB complessivi. Massimo 30 tentativi validi per account ogni 24 ore.
- Le immagini sostituite, rimosse, dei regali eliminati e degli account cancellati vengono cancellate dallo storage; gli upload rifiutati durante il collegamento vengono cancellati. Non vengono conservate copie originali o miniature aggiuntive.
- Limiti centralizzati in `lib/image-limits.ts`; utilizzo in `imageUsage`, limiti di frequenza in `imageUploadQuota`. Il tetto riguarda le immagini gestite dall’app, non altri file eventualmente caricati manualmente nel deployment. Il traffico in uscita ha una quota Convex separata.
- Le URL Convex sono accessibili a chi le possiede: l’accesso alla lista è verificato prima di restituirle, ma la revoca di un invito non invalida una URL immagine già copiata. Non caricare documenti riservati come foto regalo.
