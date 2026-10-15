# Avanzamento MVP

Aggiornamento: 15 ottobre 2026.

## Preparazione al rilascio — 15 ottobre 2026

- Decisione del titolare: primo rilascio senza webhook attivi, cancellazioni gestite manualmente. Il codice predisposto rimane disponibile; configurazione del webhook e prova di consegna sono rinviate e non bloccano questo rilascio. Procedura: [cancellazione manuale](MANUAL_DELETION.md).
- Landing IT/EN allineata alle funzioni disponibili: inviti, accesso ospite e prenotazioni non sono più presentati come «In arrivo».
- Endpoint HTTP Convex `/clerk-users-webhook`, con verifica delle firme tramite `@clerk/backend/webhooks`. Gestisce `user.created`, `user.updated`, `user.deleted`; mutation di sincronizzazione e pulizia esclusivamente interne.
- Upsert per ID Clerk, confronto di `updated_at` e timestamp evento per retry fuori ordine. Dopo la prima sincronizzazione il JWT non sovrascrive il profilo. Le cancellazioni sono terminali anche se arrivano prima della creazione del profilo.
- Alla ricezione della cancellazione: blocco dell’account e degli accessi alle sue liste, rimozione di nome/avatar; pulizia pianificata a lotti di prenotazioni, avvisi, partecipazioni, liste, regali, immagini associate, inviti e accessi ospite. Le altre liste restano disponibili. Conservato soltanto il record tecnico per impedire riattivazioni obsolete; un replay della cancellazione può riprendere la pulizia.
- Configurazione e prova reale dell’endpoint necessarie solo per una futura attivazione: vedere [Webhook Clerk](CLERK_WEBHOOKS.md). Il codice locale e i test non certificano l’attivazione nel dashboard.
- I paragrafi degli incrementi precedenti riportano le verifiche storiche, non una nuova esecuzione completa.
- Verifiche di questo incremento: 70 test unitari/backend, 24 test browser delle route e della lingua su desktop/390/360 px, TypeScript, ESLint e build di produzione superati. Gli script temporanei ignorati da Git in `.local` sono esclusi anche da ESLint.
- Schema e funzioni sincronizzati sul deployment di sviluppo con typecheck abilitato. La richiesta remota senza firma all’endpoint restituisce `503`: manca il Signing Secret sul deployment e la sincronizzazione non è ancora attiva. Nessuna pubblicazione del frontend o distribuzione in produzione; nessun account reale creato o cancellato per il collaudo.

## Italiano e inglese

- Selettore IT/EN su landing, accesso, inviti, workspace, informative e configurazione; lingua iniziale dal browser, preferenza conservata per un anno in un cookie tecnico.
- Traduzioni di navigazione, moduli, conferme, stati vuoti, errori applicativi, informative e metadati. Localizzazione Clerk e formati di data/prezzo coerenti con la scelta; importi sempre in euro.
- URL e link di invito invariati. Titoli, descrizioni e nomi inseriti dagli utenti conservano il testo originale; il cambio lingua mantiene il contenuto dei moduli aperti.
- Test di scelta della lingua, interpolazione, formati e copertura del dizionario; test browser di persistenza e flussi in inglese con account e ospiti.

## Primo incremento

### Base tecnica

- Next.js 16.4.0, React 19.3.0, Clerk 7.9.14 e Convex 1.46.0; dipendenze e lockfile pnpm aggiornati.
- Node 24.6.0 e pnpm 12.11.2, ESLint flat config, typecheck, Vitest e Playwright.
- Auth0 e pagine/API di prova sostituiti; `.env.local` originale conservato.
- `.env.example`, metadati e lingua italiana.
- Utente ha confermato che il deployment contiene soltanto dati di prova; nessuna migrazione di utenti reali richiesta. I dati remoti non sono stati eliminati.
- File generati Convex rigenerati con il comando ufficiale; schema e funzioni sincronizzati sul deployment di sviluppo. Nessuna cancellazione di dati o pubblicazione del frontend.

### UI premium valutabile

- Palette nero/argento/oro, tipografia Geist sans, titoli grandi e nastro scultoreo oro/argento integrato nell’interfaccia, ottimizzato con Next/Image.
- Componenti del workspace reale: shell, collezioni, moduli e dettagli.
- Login Clerk e menu account personalizzati con la stessa palette.
- Liste tipografiche numerate, dettagli metallici, ricerca per titolo/descrizione/proprietario e badge «Sorpresa protetta» con spiegazione accessibile.
- Gli identificatori copertina `plum/sage/sand` restano compatibili con lo schema; ora rappresentano nero/argento/oro.
- Intestazione con account Clerk; moduli in pannelli dal basso su mobile. Navigazione tra sezioni da aggiungere quando saranno disponibili.
- Liste attive/archiviate, creazione e vista proprietario con backend reale.
- Regali, dettagli, creazione, filtri e ordinamento con backend reale.
- Dialog, focus, avvisi, stati vuoti e movimento ridotto.
- Anteprima, route `/demo`, fixture e storage locale rimossi su richiesta dell’utente; moduli spostati nei componenti UI condivisi.

### Fondamenta backend

- Schema e indici per il dominio MVP.
- Helper per sessione verificata, proprietario, partecipante e stato della lista.
- Inizializzazione profilo e prime funzioni di liste e regali.
- Query proprietario e partecipante separate; copertura dei permessi e della sorpresa.
- Provider Clerk/Convex attivi; autenticazione nelle risorse del workspace e autorizzazione indipendente nelle funzioni Convex.
- `/lists` e `/lists/[id]` collegate alle query reali, con creazione liste/regali, filtro, ordinamento e dettagli dei luoghi di acquisto.
- Landing pubblica su `/`, con ingresso al workspace e registrazione Clerk; setup se la configurazione dell’app è incompleta.
- Bootstrap del profilo legato all’utente corrente, caricamento ed errori gestiti.

## Accesso e menu personalizzati — 12 ottobre 2026

- Sostituiti `SignIn`, `SignUp` e `UserButton` con componenti dell’app, usando gli hook Clerk Core 3. Palette, logo, caratteri e illustrazione condivisi con la landing; layout compatto su mobile.
- Accesso con password o codice email, recupero password con revoca delle altre sessioni, MFA e verifica di un nuovo dispositivo. Errori in italiano, invio protetto da doppi clic, mostra/nascondi password e focus al cambio di passaggio.
- Registrazione con i campi abilitati nell’istanza (incluso nome utente obbligatorio), verifica email e completamento dei dati mancanti dopo Google. Il contenitore CAPTCHA e le verifiche SDK restano attivi.
- Callback OAuth su `/sso-callback`, requisiti della sessione su `/sign-in/tasks`; il redirect richiesto ammette soltanto le liste dello stesso sito.
- Menu proprio con avatar, nome, email, liste, gestione account e uscita; tastiera, Escape, clic esterno ed errori di uscita gestiti. «Gestisci account» conserva il pannello Clerk per email, password e sicurezza.
- Metodi e campi ricavati dalla configurazione pubblica dell’istanza, con cache di cinque minuti e fallback all’attuale configurazione. Clerk resta responsabile di autenticazione e validazione; nessuna modifica ai controlli Convex.
- Verificate le pagine reali di accesso/registrazione su desktop e viewport mobili a 390/360 px (15 test delle route). I flussi e il menu sono verificati con risposte SDK simulate, senza messaggi email o utenti di prova creati sul servizio. L’accesso completo con account reale e il ritorno effettivo dal provider OAuth restano da verificare.
- Build Next.js, TypeScript, ESLint, 29 test unitari e 42 test dei componenti UI superati. Dopo l’ultimo aggiustamento all’invio del codice, rieseguiti e superati i 18 test di autenticazione/menu su desktop/mobile.

## Limiti attuali

Chiavi Clerk e URL Convex presenti nell’ambiente locale; issuer Clerk presente sul deployment. Le nuove funzioni sono state distribuite con `pnpm exec convex dev --once`. La query profilo senza autenticazione restituisce il rifiuto atteso. Login con un account reale e comunicazione autenticata con Convex non sono ancora verificati end-to-end.

Ancora da implementare: modifica dei dati delle liste, comandi UI di archivio/riattivazione (la mutation esiste), riepilogo personale delle prenotazioni, upload delle immagini dei desideri e visualizzazione degli avvisi. Webhook e cancellazione coordinata sono predisposti ma l’attivazione automatica è rinviata; per il primo rilascio la cancellazione è avviata manualmente dagli amministratori. Inviti, ospiti, prenotazione e annullamento dal dettaglio sono descritti negli incrementi del 12 ottobre qui sotto.

Turbopack ha fallito nella compilazione CSS/font a causa di un errore di avvio processo/porta nell'ambiente. Gli script sono stati impostati su Webpack e la build con Webpack è riuscita.

## Prossimo incremento

Verificare ingresso e prenotazioni simultanee con browser e account reali distinti. Completare riepilogo personale, avvisi e archiviazione, mantenendo distinti i test di autorizzazione dai test UI.

## Verifiche del primo incremento

TypeScript, ESLint e build superati sul workspace attuale. Playwright: 4 test superati, 2 duplicati del login su mobile esclusi intenzionalmente. I test backend Vitest/convex-test coprono il dominio e le autorizzazioni.

I test browser attuali verificano la landing pubblica e l’ingresso al workspace, l’accesso alla schermata di login e il 404 delle vecchie route demo su desktop e mobile. I precedenti test della preview sono stati rimossi insieme alla preview. Non certificano il flusso autenticato con un account reale, gli inviti o le prenotazioni sul deployment reale.

## Dettaglio lista e illustrazioni — 12 ottobre 2026

- Corretto il dialog condiviso: in StrictMode l’evento nativo di chiusura accodato dal cleanup poteva chiudere subito la finestra appena riaperta. Gli eventi di chiusura obsoleti vengono ignorati.
- «Dettagli» è un pulsante esplicito; titolo e superficie del regalo continuano ad aprire la stessa finestra.
- Intestazione della lista senza riquadro decorativo, con illustrazione 3D del pacco nelle varianti Nero, Argento e Oro. Il selettore dell’atmosfera usa gli stessi asset.
- Dieci illustrazioni 3D di categoria e relative opzioni: Casa e design, Tecnologia, Console e videogames, Musica, Arte, Viaggi, Fashion e stile, Beauty, Experience, Altro.
- Conservata la compatibilità con i regali della vecchia categoria `books`. Schema e funzioni Convex sincronizzati sul deployment di sviluppo con typecheck; aggiunta la configurazione TypeScript delle funzioni.
- Asset locali ottimizzati in WebP con trasparenza; prompt e riferimenti in `docs/ILLUSTRATION_PROMPTS.json` e `docs/VISUAL_ASSETS.md`.
- Verifiche: 16 test Vitest, 14 test browser dei componenti su desktop/mobile, ESLint e build Next.js superati. I test UI montano i componenti reali in StrictMode con persistenza simulata, senza route di prova nell’app; non sostituiscono una verifica con un account reale.

## Modifica, eliminazione e dettaglio regalo — 12 ottobre 2026

- Card e intestazione rese compatte; nome e prezzo hanno precedenza sulle illustrazioni. Il dettaglio regalo separa descrizione, link online con dominio, negozi e comandi del proprietario.
- Modulo di modifica precompilato, con prezzo, categoria, preferito e luoghi di acquisto; conserva indirizzi e luoghi aggiuntivi. Gli errori mantengono il modulo compilato. Eliminazione con conferma e ritorno del focus al comando Aggiungi regalo.
- Nuove mutation `gifts.update` e `gifts.remove` sincronizzate sul backend di sviluppo. Controlli server su sessione, proprietario della lista associata al regalo, stato della lista e versione. Le mutation non accettano un flag owner dal client.
- Snapshot e avvisi degli eventuali regali prenotati aggiornati in transazione; rimozioni ripetute non duplicano avvisi né decrementano nuovamente il conteggio. La UI delle prenotazioni e degli avvisi resta da implementare.
- Il logo della modale della sorpresa usa `GiftMark`, come il marchio dell’intestazione.
- 25 test unitari superati, inclusi permessi, versione obsoleta, validazione, conteggi e riepiloghi. Nuovi casi browser per modifica/eliminazione aggiunti; l’esecuzione della suite estesa è stata bloccata dal sandbox e le richieste successive di esecuzione sono state interrotte, quindi non viene dichiarata superata.

## Inviti e partecipanti — 12 ottobre 2026

- Pannello proprietario «Invita amici»: creazione esplicita del link, condivisione nativa/copia con alternativa manuale, rigenerazione/disattivazione con conferma, elenco accessi, rimozione e riabilitazione. Nessun invio automatico di email.
- Token di 32 byte generato con `node:crypto` in un’action sul server; digest SHA-256 per la ricerca. Token originale restituito solo al proprietario da una query dedicata. Creazione, rotazione e autorizzazione atomiche in una mutation interna; il link non cambia a ogni condivisione.
- `/invite/[token]` pubblica con titolo, proprietario e data, senza descrizione, regali, partecipanti o ID interni per chi non ha già accesso. Link invalidi/revocati hanno risposta generica; pagina esclusa dall’indicizzazione e protetta da referrer con metadati e header HTTP.
- Ingresso con conferma dopo login/registrazione e inizializzazione profilo, conservando la destinazione anche attraverso OAuth e requisiti di sessione. Redirect limitati alle route interne ammesse. Ingresso autenticato, idempotente e controllato sul backend.
- `/friends`, navigazione e menu account collegati alle liste condivise. `/lists/[id]` distingue proprietario/partecipante, con query indipendenti: l’amico legge i desideri e i luoghi d’acquisto senza comandi di modifica o invito.
- Link disattivati o rigenerati conservano i partecipanti attivi. Revoca blocca lettura, elenco amici e rientro anche da link nuovi; riammissione esplicita del proprietario. Revoca libera solo le eventuali prenotazioni di quella lista e non restituisce informazioni sulle scelte; la riabilitazione non ripristina prenotazioni annullate.
- Archivio blocca nuovi link, partecipanti e riammissioni; gli accessi già attivi restano consultabili. Controllati anche account non disponibili e proprietario della partecipazione ricavato dal documento, senza flag forniti dal client.
- 41 test unitari, 58 test UI dei componenti su desktop/mobile, TypeScript, ESLint e build Next.js superati. Funzioni sincronizzate sul deployment di sviluppo con typecheck abilitato; nessuna pubblicazione del frontend o modifica a dati reali di partecipazione.
- 18 test delle route reali superati su desktop e mobile a 390/360 px, inclusa l’anteprima di un token inesistente sul backend di sviluppo e gli header di protezione del referrer/indicizzazione.
- Resta la verifica completa con due account reali distinti, incluse riapertura da un altro dispositivo e concorrenza sul deployment reale. I test UI simulano persistenza e autenticazione; il successo del login reale non è dedotto dai mock.

## Ospiti e prenotazioni — 12 ottobre 2026

- Su richiesta dell’utente, l’invito offre «Accedi come ospite» senza registrazione né nome iniziale. Il nome, ripulito e limitato a 80 caratteri, è obbligatorio solo per prenotare e viene validato anche sul backend.
- Scelta esplicita dell’utente: ricordare la sessione nello stesso browser, senza link personale di recupero. Credenziale casuale di 32 byte generata dal server, digest in `guestSessions`, valore in `localStorage` per invito. La credenziale non entra nei link copiati, nelle query del proprietario o nei payload dei partecipanti. Sono mostrati invito a conservare il link e limiti dopo cambio dispositivo/cancellazione dei dati del browser.
- Lettura autorizzata tramite sessione ospite attiva, scoped alla lista del link; nomi senza verifica dell’identità. La sessione esistente conserva l’accesso dopo rotazione/disattivazione del link, mentre nuovi ingressi vengono bloccati.
- Prenotazione/annullamento collegati alla UI condivisa di ospiti e partecipanti con account. Unica prenotazione attiva per regalo, conferma esplicita, nome obbligatorio per ospite, stato «Lo regali tu», errori che conservano il modulo, annullamento con conferma e controllo dell’autore. Acquisto separato dalla prenotazione.
- Controlli atomici su lista, regalo, versione, disponibilità e principal ricavato dalla sessione/account. Stesso nome non conferisce controllo sulla prenotazione di un’altra sessione. Archivio blocca nuove scelte ma conserva consultazione e annullamento; owner autenticato, account revocati/disabilitati e proprietario disabilitato non aggirano i controlli via endpoint ospite.
- Gestione owner di accessi ospite con riferimenti anonimi creati all’ingresso, indipendenti dai nomi e dai tempi di prenotazione. Revoca libera le scelte di quella sessione e non le restituisce; ripristino non riattiva vecchie prenotazioni. La revoca riguarda la sessione: una persona anonima può rientrare da un altro browser. Non è possibile riconoscere l’identità reale di chi usa il link senza account, incluso il proprietario se si presenta come anonimo.
- Schema ampliato in modo compatibile con prenotazioni/avvisi esistenti; notifiche e snapshot supportano anche il destinatario ospite. L’interfaccia dedicata agli avvisi e il trasferimento automatico delle scelte da ospite ad account restano da implementare.
- Informative aggiornate per inviti, nomi di prenotazione, accesso ospite e memoria locale necessaria al flusso richiesto.
- 58 test unitari e 74 test UI desktop/mobile superati, inclusi conflitti, idempotenza, scoping delle credenziali, revoche, nomi uguali e assenza di variazioni nei payload owner dopo una prenotazione. TypeScript, ESLint e build superati; schema e funzioni aggiornati sul deployment di sviluppo con typecheck abilitato.
- Superati anche i 18 test delle route reali, incluse le informative aggiornate, le pagine di accesso e l’invito pubblico con header contro referrer e indicizzazione, su desktop e mobile a 390/360 px.
- Resta la prova completa del percorso ospite con due browser reali distinti, incluso ritorno dal link dopo prenotazione e concorrenza effettiva sul deployment. Nessuna prenotazione reale né account Clerk di prova creati dagli strumenti.
