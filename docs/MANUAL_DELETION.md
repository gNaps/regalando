# Cancellazione manuale degli account

Per il primo rilascio i webhook Clerk non sono attivi. Le richieste arrivano al contatto indicato nella privacy policy e vengono gestite da un amministratore. Eliminare soltanto l’account Clerk non elimina i dati applicativi in Convex.

## Account e contenuti associati

1. Verificare la richiesta e l’identità del richiedente. Individuare l’account Clerk e il suo ID; controllare il profilo corrispondente in `users` tramite `clerkId`. Non identificare la persona dal solo nome visualizzato.
2. Selezionare l’istanza Clerk e il deployment Convex dello stesso ambiente. Accertarsi che la richiesta riguardi account e contenuti, non soltanto una singola lista o prenotazione.
3. Da un accesso amministratore Convex eseguire manualmente la mutation **interna** `clerk.deleteUser`, passando `clerkId` e `eventAt` (timestamp attuale in millisecondi). Non richiede un webhook o il Signing Secret. La mutation blocca subito il profilo, rimuove nome personale/avatar e pianifica la pulizia dei dati associati. Non è esposta al browser.
4. Eliminare l’account corrispondente in Clerk. La mutation Convex non elimina le credenziali di autenticazione sul servizio Clerk e, senza webhook, la cancellazione su Clerk non avvia da sola quella Convex.
5. Controllare il completamento delle funzioni pianificate `clerk.purgeUser`. Devono essere rimossi prenotazioni, avvisi e partecipazioni dell’utente, le sue liste e i relativi regali, immagini, inviti e accessi ospite. Le sue prenotazioni nelle liste altrui vengono eliminate, liberando i regali; le liste degli altri utenti restano intatte.
6. Verificare che le liste eliminate non siano più leggibili da partecipanti o ospiti e che l’account non sia più utilizzabile. Resta un record tecnico `deleted` con ID Clerk, stato e date, senza nome personale/avatar: non eliminarlo, perché impedisce a una sessione obsoleta di ricreare il profilo.
7. Se un job fallisce, correggere la causa e rieseguire manualmente `clerk.deleteUser` con lo stesso ID. La procedura è idempotente e ripianifica la pulizia. Confermare al richiedente il completamento solo dopo aver verificato entrambi i servizi.

La procedura rimuove realmente i contenuti. Per il collaudo usare un account dedicato e le sue liste. I test automatici coprono la mutation e la pulizia a lotti, ma non certificano una cancellazione amministrativa reale attraverso entrambe le dashboard.

## Richieste parziali e ospiti

`clerk.deleteUser` elimina tutti i contenuti associati all’account: non usarla per una richiesta limitata a una lista, una prenotazione o un accesso ospite. Gestire questi casi sui soli dati interessati, verificando i riferimenti e liberando le eventuali prenotazioni. Il nome inserito da un ospite non identifica in modo univoco una persona; non chiedere credenziali tecniche via email.

La pulizia server non cancella i dati locali dei browser né elimina retroattivamente le copie di backup. Le relative informazioni restano nella privacy policy. Annotare soltanto i dati necessari a gestire la richiesta; non copiare token, segreti o dettagli delle prenotazioni nelle comunicazioni.

## Eventuale attivazione futura

Il codice webhook resta predisposto ma inattivo. La sua [configurazione](CLERK_WEBHOOKS.md) e la prova reale di consegna saranno affrontate separatamente; non sono un requisito di questo primo rilascio.
