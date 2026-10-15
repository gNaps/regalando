# Regalando — piano di refactor e MVP

Stato: implementazione avviata, primo incremento completato. Data: 11 ottobre 2026.

Vedere [avanzamento e verifiche](IMPLEMENTATION_STATUS.md) per distinguere le funzionalità della preview dalle integrazioni reali ancora da completare.

## Obiettivo

Un utente crea liste di desideri e le condivide tramite link. Gli amici accedono, prenotano un regalo e vedono le scelte degli altri; il proprietario non riceve informazioni sulle prenotazioni. L'esperienza deve essere curata su mobile e desktop, con una direzione visiva premium.

Questo documento pianifica il lavoro. Non implica che le funzionalità descritte siano già implementate.

## 1. Punto di partenza verificato nel repository

- Next.js App Router, TypeScript e Tailwind sono già presenti.
- `package.json` dichiara Next.js 15.0.3, una release candidate di React 19 e Convex ^1.17.2. Clerk non è installato.
- Convex è già abbozzato in `convex/`; l'autenticazione attuale usa Auth0, con più provider e due client Convex istanziati separatamente.
- Non è presente `convex/schema.ts`. Non ci sono ancora liste, partecipazioni o prenotazioni separate.
- `convex/gifts.ts` accetta un flag `booked` dal client e non associa il regalo a una lista o a un proprietario. Usa inoltre un oggetto `Date`, da sostituire con un timestamp numerico.
- `convex/profiles.ts` espone una creazione profilo pubblica senza controlli; `/syncUser` riceve dati senza verificare la provenienza.
- Le pagine e `/api/gifts` sono prove tecniche, con log di token e una risposta che restituisce un access token. Vanno sostituite durante il passaggio a Clerk.
- Metadati, lingua della pagina e stile sono ancora quelli del template.
- Non ci sono test o script di typecheck dedicati. Il README è quello iniziale di Next.js.
- La working tree contiene modifiche locali preesistenti, inclusa la transizione da package-lock a pnpm-lock. Non sovrascriverle indiscriminatamente.

Il repository non permette di stabilire se esistano utenti o dati reali nel deployment Convex/Auth0. Verificarlo prima di applicare modifiche allo schema o cambiare identità in un ambiente esistente.

## 2. Perimetro e decisioni di prodotto

### Incluso

- Login, registrazione, logout e gestione account tramite Clerk.
- Liste personali: creazione, modifica, archiviazione e riattivazione.
- Regali: creazione, modifica, rimozione e immagine facoltativa.
- Inviti tramite link, ingresso autenticato e accesso persistente alla lista.
- Elenco partecipanti, rimozione e riammissione.
- Prenotazione singola e annullamento da parte di chi ha prenotato.
- Liste degli amici e riepilogo personale delle prenotazioni.
- Avvisi interni per modifiche o rimozioni di regali prenotati.
- Filtri semplici per categoria e prezzo; ordinamento per priorità o prezzo.

### Regole operative

1. Una lista ha un solo proprietario. Il proprietario non può prenotare nella propria lista.
2. Un regalo corrisponde a una sola prenotazione attiva. Nessuna quantità o quota collettiva nell'MVP.
3. Il proprietario non vede stati, nomi, conteggi, cronologia o avvisi di prenotazione, neppure nelle risposte backend.
4. Gli amici autorizzati vedono disponibilità e nome di chi ha prenotato, senza email o altre informazioni private.
5. Chi possiede il link può entrare dopo il login. Prima del login vede soltanto titolo, nome del proprietario ed eventuale occasione/data, senza regali o partecipanti.
6. Rigenerare o disattivare il link impedisce nuovi ingressi attraverso quel link; le partecipazioni già attive restano valide.
7. Rimuovere un partecipante revoca l'accesso e libera le sue prenotazioni. Una partecipazione revocata impedisce di rientrare tramite link finché il proprietario non la riabilita.
8. Archiviare blocca ingressi, modifiche ai regali e nuove prenotazioni. Le prenotazioni restano consultabili e possono essere annullate; la riattivazione riapre il flusso.
9. Modifica e rimozione di un regalo sono consentite indipendentemente dalla prenotazione. Risposte e messaggi del proprietario sono uguali nei due casi.
10. La rimozione nasconde il regalo dalla lista. Chi lo aveva prenotato conserva un riepilogo con stato «Rimosso dalla lista», escluso dalle prenotazioni attive.
11. Una prenotazione non rappresenta un acquisto e non scade automaticamente.
12. Categoria, prezzo, immagine, priorità e negozio sono facoltativi. Titolo obbligatorio; descrizione disponibile per dettagli e varianti. Valuta iniziale EUR, memorizzata esplicitamente.

La lista e il prezzo indicativo non dipendono mai dalle prenotazioni: anche ordinamenti e aggregati destinati al proprietario devono mantenere la sorpresa.

### Dopo l'MVP

Pagamenti, raccolte fondi, regali di gruppo, chat, relazioni di amicizia globali, import automatico dai negozi, notifiche email/push, liste con più proprietari e tema scuro.

## 3. Architettura backend

### Fondamenta

- Mantenere Next.js App Router e TypeScript; consolidare pnpm come package manager.
- Scegliere versioni stabili e compatibili di Next.js, React, Convex e Clerk prima di aggiornare il lockfile. Allineare anche i tipi React e gli strumenti di lint.
- Usare Convex per dati, query reattive, mutation, immagini e logica applicativa.
- Usare Clerk per identità e sessioni: `ClerkProvider` sopra un unico `ConvexProviderWithClerk`; issuer configurato sul backend Convex.
- Proteggere esplicitamente le route applicative. Login, registrazione e invito restano accessibili senza sessione.
- Chiamare direttamente le funzioni Convex dalla UI per i flussi di dominio, senza un secondo livello REST equivalente in Next.js.
- Creare `.env.example` senza valori reali e documentare variabili dell'app, del deployment Convex e degli eventuali webhook.
- Separare sviluppo e produzione. Nessun token nei log o nelle risposte applicative.

L'integrazione segue la [documentazione ufficiale Convex/Clerk](https://docs.convex.dev/auth/clerk); il middleware richiede una [protezione esplicita delle route](https://clerk.com/docs/reference/nextjs/clerk-middleware).

### Modello dati proposto

| Tabella | Campi principali | Indici principali |
| --- | --- | --- |
| `users` | `clerkId`, nome visualizzato, avatar, stato account | per `clerkId` |
| `lists` | `ownerId`, titolo, descrizione, occasione, data facoltativa, stato, stile copertina | per proprietario e stato |
| `gifts` | `listId`, titolo, descrizione, `priceCents?`, valuta, categoria, priorità, immagine, luoghi di acquisto, versione, stato rimosso | per lista e stato |
| `memberships` | `listId`, `userId`, stato attivo/revocato, data ingresso | per lista/utente e per utente/stato |
| `invites` | `listId`, token privato, digest token, stato, data creazione | per digest e per lista/stato |
| `reservations` | `listId`, `giftId`, `userId`, stato, snapshot del regalo, versione vista, date | per regalo/stato, utente/stato e lista/stato |
| `notices` | destinatario, prenotazione, tipo, versione regalo, data lettura | per destinatario/data |

Gli indici supportano gli accessi; l'unicità applicativa va verificata nelle mutation, senza assumere che gli indici siano vincoli univoci.

- Prezzi in centesimi interi non negativi; valore assente distinto da zero.
- Date tecniche come timestamp numerici; data dell'occasione come giorno di calendario, senza spostamenti dovuti al fuso.
- Luoghi di acquisto come riferimenti tipizzati: URL online oppure nome/indirizzo fisico. Consentire entrambi.
- Categoria come insieme di valori stabili, con etichette italiane nel frontend.
- Snapshot aggiornato alla modifica del regalo e congelato alla rimozione; avviso della variazione e versione precedente disponibili a chi ha prenotato.
- Profilo creato e aggiornato in modo idempotente dalla sessione verificata, senza accettare un `clerkId` arbitrario dal browser. Per il primo rilascio, su decisione del titolare, la cancellazione è gestita manualmente su Clerk e Convex secondo [questa procedura](MANUAL_DELETION.md). L’attivazione dei webhook è rinviata; quando attivati, i retry non devono duplicare utenti o avvisi.

La sincronizzazione di eventi Clerk segue la [verifica dei webhook](https://clerk.com/docs/guides/development/webhooks/syncing). L'autorizzazione quotidiana resta basata sulla sessione verificata, senza attendere la consegna di un webhook.

### Autorizzazioni e contratti

Centralizzare helper per utente autenticato, proprietario, partecipante attivo e lista modificabile.

- `lists.getOwned` / `lists.getOwnerDetail`: restituiscono soltanto informazioni del proprietario.
- `lists.getJoined` / `lists.getParticipantDetail`: richiedono partecipazione attiva e includono lo stato dei regali.
- `gifts.create/update/remove`: accesso del proprietario; nessun campo di prenotazione negli argomenti o nella risposta.
- `invites.preview`: anteprima minima; inviti invalidi/revocati hanno un messaggio generico.
- `invites.join`: autenticata, idempotente e compatibile con revoche e archiviazione.
- `invites.rotate/disable`, `memberships.list/revoke/restore`: solo proprietario. Le risposte non riportano prenotazioni liberate.
- `reservations.reserve`: valida utente, partecipazione, lista, regalo e disponibilità nella stessa mutation.
- `reservations.cancel`: consente l'annullamento solo a chi ha prenotato; ripetizioni non producono effetti aggiuntivi.
- `reservations.getMine`: include solo prenotazioni proprie e verifica l'accesso corrente alla lista; esclude qualsiasi lista posseduta dall'utente.
- `notices.getMine/markRead`: solo destinatario, con la stessa protezione rispetto a revoche e proprietà.

Il controllo della disponibilità e la scrittura avvengono in una sola mutation; le [transazioni Convex](https://docs.convex.dev/database/advanced/occ) sono la base per gestire la concorrenza. Verificare comunque il caso reale con due sessioni.

### Inviti e immagini

- Generare token con casualità crittografica e salvare il digest per la ricerca. Nessun ID sequenziale come credenziale di invito. Conservare anche il token originale come campo privato, leggibile esclusivamente dal proprietario attraverso una funzione dedicata; nessuna query generica deve esporre il documento invito.
- «Condividi invito» recupera il link attivo per il proprietario oppure ne crea uno se assente. La rotazione revoca il precedente e genera un nuovo token; dopo una disattivazione, la creazione richiede un'azione esplicita. Non rigenerare il link a ogni condivisione.
- Escludere le pagine invito dall'indicizzazione ed evitare che il token compaia in referrer, analytics e log applicativi.
- Immagini tramite storage Convex: URL di upload autorizzato, verifica di formato/dimensione e associazione solo a regali propri.
- Tenere traccia dell'ownership degli upload; non accettare storage ID arbitrari. Gestire sostituzioni e file orfani.
- Per l'MVP consentire JPEG, PNG e WebP fino a 5 MB; niente caricamento SVG o acquisizione automatica da URL esterni.

Il flusso immagini segue gli [upload tramite URL generati da Convex](https://docs.convex.dev/file-storage/upload-files).

## 4. Frontend e UI premium

### Direzione visiva da prototipare

- Fondo nero `#101011`, superfici grafite `#1B1B1D`, testo argento `#F5F3EF`, accento oro `#DFC58E` per azioni principali e navigazione attiva.
- Tipografia Geist sans locale, titoli grandi e composizione visiva audace. Nastro scultoreo oro/argento integrato nell’interfaccia, liste tipografiche numerate con dettagli metallici.
- Scala coerente di spaziatura, bordi sottili, ombre leggere, card arrotondate e pulsanti a pillola.
- Tre atmosfere grafiche selezionabili per le liste. Le immagini di marca fanno parte della UI, senza essere assegnate alle liste.
- Card regalo con proporzioni immagini coerenti e segnaposto tipografico/grafico curato.
- Feedback e transizioni brevi, compatibili con preferenze di movimento ridotto.
- Interfaccia e messaggi in italiano. Metadati e `lang` coerenti con Regalando.

Prima implementare un prototipo navigabile di elenco liste, dettaglio proprietario e dettaglio amico, usando dati dimostrativi isolati. Includere esempi senza immagini, titoli lunghi, lista vuota e regalo prenotato.

### Navigazione e route proposte

| Route | Scopo | Accesso |
| --- | --- | --- |
| `/` | Presentazione essenziale; redirect alle liste se autenticato | pubblico |
| `/sign-in`, `/sign-up` | Flussi Clerk, con route catch-all dove richieste | pubblico |
| `/invite/[token]` | Anteprima e ingresso alla lista | anteprima pubblica, ingresso autenticato |
| `/lists` | Le mie liste | autenticato |
| `/friends` | Liste degli amici | autenticato |
| `/reservations` | Le mie prenotazioni e avvisi | autenticato |
| `/lists/[id]` | Dettaglio con vista autorizzata proprietario/partecipante | autenticato e autorizzato |
| `/lists/[id]/settings` | Partecipanti, invito e archiviazione | proprietario |

Desktop: navigazione superiore compatta, contenuto con larghezza controllata. Mobile: dock flottante con Desideri, Amici e Scelti da me; account nell'intestazione. Impostazioni della lista separate dall'account.

### Flussi e componenti

1. **Creazione lista:** titolo obbligatorio, descrizione/occasione/data facoltative; dopo il salvataggio si apre il dettaglio con invito ad aggiungere il primo regalo.
2. **Lista proprietario:** azioni «Aggiungi regalo» e «Invita amici»; nessuno stato di prenotazione. Conteggio esclusivamente dei regali visibili.
3. **Regalo:** modulo con titolo, descrizione, prezzo e luoghi di acquisto; dettagli facoltativi progressivi. Pannello ampio su desktop, schermata o pannello a tutta altezza su mobile. Dati conservati in caso di errore.
4. **Condivisione:** menu nativo quando disponibile, copia link come alternativa; messaggio chiaro che il link può essere inoltrato.
5. **Ingresso:** conservare la destinazione attraverso il login e accettare solo redirect interni validi. Ingresso idempotente e ritorno alla lista dopo la conferma.
6. **Lista amico:** disponibile, «Prenotato da Marco», «Lo regali tu». Colore accompagnato sempre da testo. Dettaglio con acquisto separato da prenotazione.
7. **Prenotazione:** conferma breve sulla visibilità agli altri amici e sulla sorpresa; attesa del risultato backend, azione disabilitata durante l'invio, gestione chiara dei conflitti.
8. **Prenotazioni personali:** raggruppate per destinatario, con data occasione, regalo, negozio, annullamento e avvisi. Regali rimossi in una sezione distinta dagli impegni attivi.
9. **Impostazioni:** gestione link, elenco partecipanti, rimozione/riammissione e archivio; nessun dettaglio sulle scelte dei partecipanti.

Componenti condivisi: shell, pulsanti, input, textarea, selettori, card, badge, dialog/pannelli, toast, skeleton, stati vuoti e messaggi di errore. Un solo sistema di token visivi e di focus.

### Criteri UX

- Nessuno scorrimento orizzontale a 360 px; pulsanti principali comodi da toccare.
- Percorsi utilizzabili da tastiera, focus visibile, etichette accessibili e focus gestito nei dialog.
- Conferma prima di perdere modifiche e prima di operazioni distruttive.
- Caricamento distinto da lista vuota; errore con possibilità di riprovare.
- Prevenzione doppio invio; nessuna conferma di prenotazione prima dell'esito backend.
- Prezzi formattati in italiano e descrizioni trattate come testo, senza HTML arbitrario.
- Link online ammessi soltanto con protocolli HTTP/HTTPS, con apertura esterna sicura.
- Testi lunghi, foto mancanti, rete lenta e accesso revocato non devono rompere il layout.

## 5. Sequenza di lavoro e criteri di completamento

| Fase | Lavoro | Dipendenze | Completata quando |
| --- | --- | --- | --- |
| **0 — Baseline** | Verificare toolchain, dati/utenti esistenti, package manager e configurazioni; documentare errori attuali e strategia di migrazione | accesso al repo; verifica deployment quando disponibile | esiste una procedura di sviluppo chiara e nessun dato esistente rischia di essere perso |
| **1 — Prototipo visivo** | Token, componenti, shell e tre viste con dati dimostrativi | fase 0 | direzione premium valutabile su mobile e desktop, inclusi stati vuoti |
| **2 — Identità e dominio** | Versioni compatibili, Clerk, unico provider Convex, schema, indici, helper autorizzazione e profili | fase 0; configurazione Clerk/Convex per verifica reale | login/logout funzionano e le query riconoscono identità e permessi |
| **3 — Liste e regali** | Operazioni complete, validazione, immagini e UI collegata ai dati reali | fasi 1–2 | un utente crea più liste e gestisce regali persistenti |
| **4 — Inviti e accessi** | Link, anteprima, login di ritorno, partecipazioni, revoca e liste amici | fase 3 | un secondo utente entra e ritrova la lista; accessi revocati restano bloccati |
| **5 — Prenotazioni e sorpresa** | Mutation atomiche, query separate, vista amici e prenotazioni personali | fase 4 | due amici si coordinano e il proprietario non riceve dati di prenotazione |
| **6 — Ciclo completo** | Avvisi, rimozioni, archivio, gestione account e cleanup | fase 5 | modifiche e revoche lasciano dati e schermate coerenti |
| **7 — Rilascio MVP** | Verifiche finali, rifinitura, configurazione produzione e documentazione | fase 6 | scenario completo superato in ambiente reale e nessun blocco critico aperto |

Ogni fase produce un incremento piccolo e verificabile. La fase 1 rende concreta la UI prima di completare il backend; la fase 2 fissa i contratti usati dalle schermate.

## 6. Piano di verifica

### Baseline tecnica

Typecheck, lint e build con dipendenze compatibili. Registrare gli errori preesistenti prima di correggerli; aggiungere script espliciti e riproducibili. Rigenerare i file Convex con gli strumenti ufficiali, senza modificarli a mano.

### Backend

Usare Vitest e [convex-test](https://docs.convex.dev/testing/convex-test) per regole di dominio e autorizzazioni, con identità proprietario/amico/estraneo. Coprire:

- Il proprietario non riceve prenotazioni, prenotatori, conteggi o avvisi da nessuna funzione pubblica, inclusi riepiloghi personali e query per ID.
- Un estraneo, un utente anonimo o un partecipante revocato non può leggere o modificare dati riservati.
- Il client non può falsificare ownership, profili, prenotatori o storage ID.
- Prenotazione e annullamento ripetuti restano coerenti; dopo annullamento il regalo torna disponibile.
- Inviti revocati, rotazione, ingresso ripetuto e mancata riammissione via link.
- Modifica e rimozione producono risposte equivalenti al proprietario; avvisi visibili solo al destinatario.
- Archivio, revoca partecipazione e cancellazione identità aggiornano le prenotazioni correttamente.
- Webhook invalidi rifiutati e consegne ripetute idempotenti.

La concorrenza e l'integrazione Clerk richiedono anche una verifica su un deployment di sviluppo reale: il mock non sostituisce quella prova.

### End-to-end e visuale

Playwright per i percorsi critici, con sessioni distinte e account di test:

1. Proprietario crea lista e regalo, poi condivide.
2. Due amici entrano passando dal login; entrambi ritrovano la lista.
3. Prenotazioni simultanee: una sola confermata; gli amici vedono lo stesso stato.
4. Proprietario consulta la lista: controllare UI e payload backend, senza dati della prenotazione.
5. Annullamento, modifica regalo, rimozione e revoca accesso.
6. Link invalido, lista archiviata e perdita di connessione.

Verificare layout a 360/390 px e desktop, tastiera, zoom, contenuti lunghi e immagini assenti. Eseguire una prova manuale del link condiviso su un telefono reale.

## 7. Migrazione e rilascio

- Se esistono dati reali: inventario e backup; mapping esplicito tra identità Auth0 e Clerk; migrazione di profili/regali con riconciliazione. Non associare account automaticamente soltanto per email.
- Se il deployment contiene solo prove: lavorare su un nuovo ambiente di sviluppo, conservando i dati precedenti fino alla verifica. Nessuna cancellazione implicita.
- Configurare separatamente Clerk e Convex per produzione, URL di ritorno e variabili del frontend. I webhook restano inattivi per il primo rilascio; le cancellazioni sono manuali.
- Hosting Next.js da scegliere in fase di rilascio; Vercel è un candidato, non una configurazione già esistente.
- Prima del rilascio, sostituire il README con setup, comandi, variabili, test, deploy e regole della sorpresa.
- Conservare una versione recuperabile dell'app e una procedura di rollback compatibile con gli eventuali cambiamenti allo schema.
- Se le credenziali non sono disponibili, completare prototipo e lavoro verificabile localmente; riportare separatamente le verifiche reali ancora mancanti, senza dichiarare completa l'integrazione.

## 8. Definizione di MVP pronto

- [ ] Autenticazione Clerk e accesso Convex verificati in ambiente reale.
- [ ] Creazione e gestione di liste e regali, con immagini facoltative.
- [ ] Invito tramite link con ritorno corretto dal login.
- [ ] Partecipazioni persistenti, revoca e riammissione.
- [ ] Una sola prenotazione attiva per regalo, anche con richieste simultanee.
- [ ] Sorpresa protetta dal backend, anche nei riepiloghi e nei casi di modifica.
- [ ] Area prenotazioni e avvisi utilizzabili.
- [ ] Archivio e ciclo di rimozione coerenti.
- [ ] UI premium coerente e accessibile su mobile e desktop.
- [ ] Typecheck, lint, build, test di dominio e percorsi critici superati.
- [ ] Migrazione risolta se necessaria; ambienti e documentazione pronti.

Prima attività di implementazione: fase 0, seguita dal prototipo visivo della fase 1. Nessuna configurazione o distribuzione esterna è stata eseguita durante la preparazione di questo piano.
