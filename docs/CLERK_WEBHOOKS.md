# Webhook utenti Clerk

Decisione per il primo rilascio: webhook inattivi e cancellazione gestita manualmente dagli amministratori. L’attivazione descritta qui è rinviata e non blocca il rilascio. Usare la [procedura manuale](MANUAL_DELETION.md) per le richieste di cancellazione.

Il frontend inizializza il profilo dalla sessione verificata tramite `profiles.ensure`. I webhook mantengono il profilo sincronizzato anche fuori dal workspace e gestiscono la cancellazione dell’account.

Stato al 15 ottobre 2026: schema e funzioni distribuiti sul deployment di sviluppo. L’endpoint di sviluppo è `https://hallowed-husky-447.convex.site/clerk-users-webhook`; restituisce `503` perché il Signing Secret non è configurato. Questo stato inattivo è intenzionale per il primo rilascio. Una futura attivazione richiederà configurazione Clerk/Convex e una consegna reale riuscita. Nessuna configurazione o distribuzione di produzione eseguita.

## Configurazione per ogni ambiente

1. Distribuire schema e funzioni sul deployment Convex di sviluppo selezionato con `pnpm convex:dev`. Per la produzione usare il processo di rilascio dedicato, con chiavi separate.
2. Nel dashboard Clerk dell’istanza corrispondente aprire **Webhooks → Add endpoint**. Usare `https://<deployment>.convex.site/clerk-users-webhook`, ricavando il dominio HTTP dalle impostazioni del deployment Convex. Non usare il dominio `.convex.cloud` del client né l’URL Next.js.
3. Selezionare `user.created`, `user.updated` e `user.deleted`.
4. Copiare il **Signing Secret** dell’endpoint nelle variabili d’ambiente di quel deployment Convex come `CLERK_WEBHOOK_SIGNING_SECRET`. Non è la `CLERK_SECRET_KEY` e non deve avere un prefisso `NEXT_PUBLIC_`. Non inserirlo nel repository, nei messaggi o nei log.
5. Verificare che `CLERK_JWT_ISSUER_DOMAIN` appartenga alla stessa istanza Clerk. Ripetere la configurazione separatamente per produzione.
6. Controllare nel dashboard Clerk una consegna effettiva riuscita dopo ogni configurazione. I test locali non attivano né certificano l’endpoint remoto.

In assenza del Signing Secret l’endpoint restituisce `503`, senza scrivere. Firma mancante, errata o scaduta produce `400`; una consegna gestita o un tipo evento estraneo riceve `204`. Gli errori di persistenza non sono convertiti in successo, così Clerk può riprovare. I payload e i segreti non sono registrati nei log applicativi.

## Sincronizzazione e cancellazione

- Creazione e aggiornamento fanno upsert per ID Clerk. Sono conservati solo nome, avatar e timestamp necessari alla sincronizzazione; email e metadati non sono copiati nel database.
- Vince il `data.updated_at` più recente; a parità, il timestamp dell’evento. Retry ed eventi precedenti non sovrascrivono dati successivi. Dopo il primo webhook il bootstrap non riscrive il profilo con claim JWT eventualmente obsoleti.
- `user.deleted` è terminale: il profilo diventa `deleted`, nome/avatar vengono rimossi e proprietario, partecipanti e ospiti perdono l’accesso alle sue liste non appena la mutation viene applicata. Il blocco dipende dalla consegna del webhook, non dal solo clic nella UI Clerk.
- La pulizia pianificata elimina a lotti le prenotazioni dell’utente anche nelle liste altrui, liberando i regali, gli avvisi e le partecipazioni. Elimina poi le liste di proprietà e i relativi regali, immagini, inviti, accessi ospite, partecipazioni, prenotazioni e avvisi. Non elimina le liste degli altri utenti.
- Resta un record tecnico con ID Clerk, stato e timestamp, senza nome/avatar, per rifiutare vecchi webhook e sessioni. La rimozione non comprende i backup dei fornitori o la memoria locale dei browser degli ospiti.
- Richieste via email e cancellazioni di dati specifici possono ancora essere gestite manualmente. Non è stata aggiunta una schermata di cancellazione nell’app.

## Verifica prima di una futura attivazione

Con un account **appositamente creato per il collaudo**, verificare creazione, aggiornamento nome/avatar e cancellazione tramite Clerk. La cancellazione rimuove realmente i contenuti: non usare un account da conservare.

Controllare da un altro account e da un browser ospite che le liste cancellate non siano più leggibili; verificare che le prenotazioni dell’account cancellato nelle altre liste vengano liberate. Controllare i job pianificati nella dashboard Convex fino al completamento. Se la pulizia fallisce, correggere la causa e riprodurre `user.deleted` dal dashboard Clerk: il replay ripianifica una pulizia idempotente. Per incidenti di consegna, Clerk permette il replay degli eventi falliti.

## Riferimenti

- [Convex: memorizzazione utenti e webhook](https://docs.convex.dev/auth/database-auth)
- [Clerk: firme, retry e ordine degli eventi](https://clerk.com/docs/guides/development/webhooks/overview)
- [Clerk: configurazione e verifica dei webhook](https://clerk.com/docs/guides/development/webhooks/sync-data)
