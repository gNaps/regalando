# Informative privacy e cookie

Le pagine pubbliche `/privacy` e `/cookie` descrivono le funzionalità presenti nel repository. I footer di landing, workspace, autenticazione e pagine legali le rendono accessibili. Non dipendono da Clerk o Convex e sono leggibili senza JavaScript.

Aggiornamento del 12 ottobre 2026: informative allineate a inviti, ospiti e prenotazioni. Il nome inserito alla prenotazione viene conservato in Convex e mostrato agli altri partecipanti; non è un’identità verificata e non viene mostrato nella vista del proprietario. La sessione ospite usa memoria locale con chiavi `regalando:guest:` per ricordare la propria scelta nel medesimo browser, fino alla cancellazione dei dati del sito. Nessuna scadenza automatica o link di recupero; la cancellazione della memoria locale non elimina la prenotazione server. Il backend conserva il digest della credenziale, e i link copiati non includono la credenziale. L’inventario di produzione resta da verificare come indicato sotto.

Titolare comunicato: Gabriele Napoli. Email confermata: gabriele.nap@gmail.com. Recapito comunicato il 12 ottobre 2026: Via Matteotti 64, Gaggiano (Milano), Italia. Dati condivisi in `lib/legal.ts`.

## Stato editoriale

Decisione del 15 ottobre 2026: primo rilascio senza webhook attivi. Le informative IT/EN descrivono la cancellazione avviata manualmente dagli amministratori su Clerk e Convex, con rimozione dei contenuti e delle prenotazioni e conservazione del riferimento tecnico senza nome personale/avatar per impedire riattivazioni da vecchie sessioni. La [procedura manuale](MANUAL_DELETION.md) usa la mutation interna di pulizia già predisposta; eliminare soltanto l’account Clerk non avvia la pulizia Convex. L’attivazione futura dei webhook è documentata separatamente in [CLERK_WEBHOOKS.md](CLERK_WEBHOOKS.md).

Su richiesta del titolare è stata rimossa l’etichetta pubblica «Bozza in revisione». Il titolare ha confermato che gli amministratori cancellano manualmente i dati quando ricevono una richiesta; la privacy policy descrive questa procedura, con contatto email e possibilità di richiedere anche la cancellazione dell’account. Non è stata aggiunta una schermata di cancellazione nell’app.

La rimozione dell’etichetta è un cambiamento editoriale: non equivale a una verifica della configurazione di produzione. Le informazioni ancora da verificare rimangono esplicite nei testi. Restano i seguenti controlli:

- Confermare hosting, servizi di posta, accordi con i fornitori, subfornitori, regioni effettive e basi applicabili ai trasferimenti extra SEE. Non è stata assunta una localizzazione europea né un contratto già sottoscritto.
- Confermare la conservazione dei dati gestiti da Clerk, delle richieste email e dei log. La procedura manuale di cancellazione è stata confermata dal titolare; la sua esecuzione nelle dashboard non è stata verificata. Il titolare ha indicato di usare i tempi di Convex: la policy riporta quelli documentati per i backup e il comportamento attuale del database, senza estenderli ad altri servizi.
- Verificare l’inventario dei cookie e degli altri strumenti sul dominio di produzione, da browser pulito prima dell’accesso, durante registrazione/accesso, dopo autenticazione e dopo logout. Registrare solo nomi, finalità, fornitore, domini, scadenze e categoria, **mai valori dei cookie o token**. Completare la pagina cookie con i risultati, compresi eventuali sistemi antiabuso aggiunti dai fornitori. La scadenza del JWT non equivale alla durata del cookie.
- Verificare che non siano attivi strumenti facoltativi in hosting o nelle dashboard dei fornitori; se aggiunti, rivalutare informativa e consenso prima dell’attivazione.
- Aggiornare i testi con i risultati dei controlli, senza presentare impostazioni non verificate come fatti accertati.

## Riscontri nel codice

- Clerk gestisce autenticazione e account, Convex archivia profilo (ID Clerk, nome, eventuale avatar), liste e desideri.
- Condivisione, inviti, accesso ospite e prenotazioni sono implementati. Per il primo rilascio la cancellazione è avviata manualmente dagli amministratori; le mutation di sincronizzazione e pulizia sono interne. Il webhook rimane inattivo e non viene presentato come servizio disponibile nell’informativa.
- Provider Clerk limitato ad autenticazione e workspace; le pagine pubbliche non lo montano. Font e immagini della landing sono locali.
- Non sono presenti integrazioni applicative di pubblicità o analytics. Questo controllo del repository non è un audit della produzione.
- La telemetria SDK Clerk è descritta dal fornitore come opzionale, relativa alle istanze di sviluppo e senza informazioni sugli utenti. Non viene descritta nelle pagine come un sistema di marketing di Regalando.
- Nessun banner di consenso aggiunto: il codice attuale integra l’autenticazione tecnica. La scelta va rivalutata se l’audit di produzione trova strumenti che richiedono consenso.

## Conservazione Convex: verifica del 12 ottobre 2026

- I dati del database non hanno una scadenza automatica implementata in Regalando. Le durate dei backup non sono una durata di conservazione di profili, liste o desideri.
- La documentazione Backup & Restore specifica 7 giorni per backup manuali e giornalieri e 14 per settimanali. I backup periodici richiedono il piano Pro. Non è stata assunta l’attivazione di questi backup nell’istanza: il testo usa «quando utilizzati».
- Questi termini si riferiscono alla funzione documentata di backup del database, non a ogni copia interna del fornitore o a eventuali esportazioni scaricate altrove. La stessa pagina descrive separatamente i backup fisici per hardware dedicato; il piano effettivo resta da verificare.
- La pagina Logs descrive una cronologia recente senza un termine numerico generale; eventuali log stream esterni hanno impostazioni proprie. Non è stato inventato un numero di giorni.

Fonti: [Convex Backup & Restore](https://docs.convex.dev/database/backup-restore), [Writing Data](https://docs.convex.dev/database/writing-data), [Logs](https://docs.convex.dev/dashboard/deployments/logs).

## Riferimenti consultati l’11 ottobre 2026

- [Garante: contenuti dell’informativa e principi del trattamento](https://www.garanteprivacy.it/home/principi-fondamentali-del-trattamento)
- [Garante: diritti degli interessati](https://www.garanteprivacy.it/Regolamentoue/diritti-degli-interessati)
- [Garante: esercizio dei diritti e reclamo](https://garanteprivacy.it/home/diritti/come-agire-per-tutelare-i-tuoi-dati-personali)
- [Garante: linee guida cookie del 10 giugno 2021](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876)
- [Clerk: cookie](https://clerk.com/docs/guides/how-clerk-works/cookies), [terminologia SDK](https://clerk.com/docs/guides/development/sdk-development/terminology), [opzioni di sessione](https://clerk.com/docs/guides/secure/session-options), [telemetria](https://clerk.com/docs/guides/how-clerk-works/security/clerk-telemetry), [DPA](https://clerk.com/legal/dpa)
- [Convex: regioni di deployment](https://docs.convex.dev/production/regions), [DPA](https://www.convex.dev/legal/dpa)

I riferimenti dei fornitori non sostituiscono la verifica delle impostazioni e dei contratti dell’istanza di Regalando.
