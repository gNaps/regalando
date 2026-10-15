import { getI18n } from "@/lib/i18n-server";
import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
  title: t("Privacy policy"),
  description: t("Come Regalando tratta i dati dell’account, delle liste e dei desideri e come esercitare i tuoi diritti."),
};
}

export default async function PrivacyPage() {
  const { t } = await getI18n();
  return <article className="legal-document">
    <h1>{t("Privacy policy")}</h1>
    <p className="legal-intro">{t("I tuoi desideri raccontano qualcosa di te. Qui spieghiamo quali dati utilizza Regalando, per quali finalità e come puoi gestirli.")}</p>
    <p>{t("Questa informativa riguarda il sito e l’app Regalando ed è predisposta ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 (GDPR). Descrive le funzionalità attualmente disponibili.")}</p>

    <section aria-labelledby="titolare"><h2 id="titolare">{t("1. Chi tratta i tuoi dati")}</h2>
      <p>{t("Il titolare del trattamento è") + " "}<strong>{legal.controller}</strong>{t(". Per domande sulla privacy o per esercitare i tuoi diritti, scrivi a") + " "}<a href={`mailto:${legal.email}`}>{legal.email}</a>.</p>
      <p>{t("Recapito postale del titolare:") + " "}{legal.address}.</p>
    </section>

    <section aria-labelledby="dati"><h2 id="dati">{t("2. Quali dati utilizziamo")}</h2>
      <ul>
        <li><strong>{t("Account e accesso:")}</strong> {" " + t("indirizzo email, identificativo dell’account, nome, eventuale immagine del profilo e dati necessari per autenticarti, gestiti tramite Clerk. Se scegli un accesso con un account esterno, riceviamo i dati di profilo resi disponibili da quel servizio.")}</li>
        <li><strong>{t("Liste e desideri:")}</strong> {" " + t("titoli, descrizioni, occasione ed eventuale data, idee regalo, prezzo indicativo, categoria, priorità e indicazioni su link o negozi. Questi contenuti sono associati al tuo account e archiviati tramite Convex insieme al nome e all’eventuale immagine del profilo.")}</li>
        <li><strong>{t("Inviti, ospiti e prenotazioni:")}</strong> {" " + t("link di invito, accessi alle liste, regalo scelto, stato della prenotazione e, per chi prenota senza account, il nome inserito. Per gli ospiti una credenziale tecnica salvata nel browser permette di riconoscere le proprie prenotazioni; sul backend ne conserviamo l’impronta, senza creare un account Clerk.")}</li>
        <li><strong>{t("Dati tecnici:")}</strong> {" " + t("indirizzo IP, informazioni sul browser e sul dispositivo, richieste al servizio e dati di sessione possono essere trattati dall’infrastruttura per erogare e proteggere il servizio.")}</li>
        <li><strong>{t("Richieste di assistenza:")}</strong> {" " + t("indirizzo email e contenuto dei messaggi che invii al titolare.")}</li>
      </ul>
      <p>{t("I dati provengono da te, dal tuo utilizzo del servizio e, per l’accesso, dal fornitore di autenticazione. Inserisci nelle liste solo informazioni pertinenti ai regali, evitando dati sensibili o informazioni personali di altre persone non necessarie.")}</p>
    </section>

    <section aria-labelledby="finalita"><h2 id="finalita">{t("3. Perché li trattiamo")}</h2>
      <ul>
        <li><strong>{t("Fornire il servizio:")}</strong> {" " + t("creare e riconoscere l’account o l’accesso ospite, salvare liste e desideri, gestire inviti e prenotazioni e rispondere alle richieste di assistenza relative al servizio. La base giuridica è l’esecuzione del rapporto con l’utente o di misure richieste prima della sua instaurazione (art. 6, par. 1, lett. b GDPR).")}</li>
        <li><strong>{t("Proteggere l’app:")}</strong> {" " + t("gestire accessi e anomalie e contrastare abusi. La base giuridica è il legittimo interesse del titolare alla sicurezza e al funzionamento del servizio, nel rispetto dei diritti degli utenti (art. 6, par. 1, lett. f).")}</li>
        <li><strong>{t("Rispettare obblighi di legge:")}</strong> {" " + t("gestire richieste sui diritti privacy e rispondere alle autorità quando dovuto (art. 6, par. 1, lett. c).")}</li>
      </ul>
      <p>{t("I dati necessari all’autenticazione e al salvataggio delle liste sono indispensabili per usare le relative funzioni; gli altri dettagli dei desideri sono facoltativi. Puoi consultare la landing e queste informative senza registrarti. Con un link valido puoi anche entrare in una lista come ospite; il nome è obbligatorio solo se prenoti un regalo.")}</p>
      <p>{t("La versione attuale non integra pubblicità comportamentale o analytics di marketing, né utilizza i desideri per decisioni esclusivamente automatizzate con effetti giuridici o analogamente significativi.")}</p>
    </section>

    <section aria-labelledby="destinatari"><h2 id="destinatari">{t("4. Chi può ricevere i dati")}</h2>
      <p>{t("Il titolare e i fornitori tecnici trattano i dati necessari alle rispettive attività. Regalando utilizza") + " "}<strong>Clerk</strong> {" " + t("per account e autenticazione e") + " "}<strong>Convex</strong> {" " + t("per il database dell’app. Possono inoltre intervenire fornitori di hosting e di posta elettronica e, nei casi previsti dalla legge, le autorità competenti.")}</p>
      <p>{t("Il fornitore di hosting e l’elenco completo dei servizi di produzione sono ancora da confermare. Per informazioni sui fornitori già integrati puoi consultare le informative di") + " "}<a href="https://clerk.com/legal/privacy">Clerk</a> {" " + t("e") + " "}<a href="https://www.convex.dev/legal/privacy">Convex</a>.</p>
      <p>{t("Le liste sono accessibili al proprietario e alle persone che entrano tramite un invito, anche senza account. Chi possiede un link valido può aprire la lista e inoltrare il link ad altri. Gli altri partecipanti, inclusi gli ospiti, vedono il nome associato a un regalo prenotato. I nomi inseriti dagli ospiti non sono verificati dal servizio.")}</p>
      <p>{t("La vista del proprietario non mostra prenotazioni o nomi associati ai regali scelti. Per gestire gli accessi il proprietario vede i partecipanti con account e riferimenti anonimi agli accessi ospite. L’accesso anonimo tramite link non permette di verificare l’identità reale di chi lo usa.")}</p>
    </section>

    <section aria-labelledby="trasferimenti"><h2 id="trasferimenti">{t("5. Dove vengono trattati")}</h2>
      <p>{t("L’uso di fornitori internazionali può comportare trattamenti al di fuori dello Spazio economico europeo. Regioni di archiviazione, subfornitori e garanzie applicabili alla configurazione di produzione restano da verificare.")}</p>
      <p>{t("Eventuali trasferimenti richiedono una base prevista dal GDPR, come una decisione di adeguatezza applicabile al destinatario o clausole contrattuali standard con le ulteriori misure necessarie. Puoi chiedere al titolare informazioni e copia delle garanzie applicabili.")}</p>
    </section>

    <section aria-labelledby="conservazione"><h2 id="conservazione">{t("6. Per quanto tempo")}</h2>
      <p><strong>{t("Profilo, liste e desideri.")}</strong> {" " + t("I dati archiviati in Convex sono conservati per rendere disponibili i tuoi contenuti durante l’uso del servizio. La versione attuale non applica una scadenza automatica a questi dati. Puoi richiederne la cancellazione scrivendo a") + " "}<a href={`mailto:${legal.email}`}>{legal.email}</a>{t(". Gli amministratori gestiscono la richiesta e cancellano manualmente i dati interessati, salvo gli eventuali obblighi di conservazione previsti dalla legge. La richiesta può riguardare anche l’account di autenticazione; eliminare il solo account non elimina automaticamente tutti i contenuti nell’app.")}</p>
      <p>{t("La cancellazione completa viene avviata dagli amministratori su Clerk e Convex e comprende i contenuti e le prenotazioni associati all’account, senza eliminare le liste degli altri utenti. In Convex resta un riferimento tecnico con identificativo Clerk, stato e date, senza nome personale o avatar, per impedire che vecchie sessioni ricreino il profilo cancellato.")}</p>
      <p><strong>{t("Copie di sicurezza Convex.")}</strong> {" " + t("Per i backup del database gestiti dalla relativa funzione di Convex si applicano le durate documentate dal fornitore, quando utilizzati: 7 giorni per quelli manuali e giornalieri, 14 giorni per quelli settimanali. Una copia creata prima della cancellazione può quindi contenere ancora i dati fino alla sua scadenza o eliminazione. Questi termini riguardano le copie di sicurezza e non costituiscono una scadenza dei dati nel database principale. Consulta la") + " "}<a href="https://docs.convex.dev/database/backup-restore">{t("documentazione sui backup di Convex")}</a>.</p>
      <p><strong>{t("Account e sessioni.")}</strong> {" " + t("I dati di autenticazione sono gestiti da Clerk; i tempi dei backup Convex non si applicano all’account o ai cookie di accesso. Le durate dei cookie sono descritte nella") + " "}<Link href="/cookie">{t("Cookie policy")}</Link>{t(", da completare con la verifica della configurazione di produzione.")}</p>
      <p><strong>{t("Ospiti e prenotazioni.")}</strong> {" " + t("La credenziale ospite resta nella memoria locale del browser fino alla cancellazione dei dati del sito; non ha una scadenza automatica. Accessi, nomi e prenotazioni in Convex seguono la procedura di cancellazione manuale sopra descritta. Cancellare i dati del browser non elimina una prenotazione e fa perdere la possibilità di annullarla da quel browser. Per una richiesta relativa a un accesso ospite, indica la lista e il nome usato senza inviare credenziali tecniche.")}</p>
      <p><strong>{t("Log e comunicazioni.")}</strong> {" " + t("Convex rende disponibile una cronologia recente delle attività; la") + " "}<a href="https://docs.convex.dev/dashboard/deployments/logs">{t("documentazione dei log")}</a> {" " + t("non indica in questa pagina un termine numerico generale. Le durate effettive dei log degli altri fornitori e della conservazione delle email devono ancora essere confermate. Le comunicazioni sono trattate per gestire le richieste ricevute e gli eventuali obblighi di legge o esigenze di tutela di diritti.")}</p>
    </section>

    <section aria-labelledby="diritti"><h2 id="diritti">{t("7. I tuoi diritti")}</h2>
      <p>{t("Nei casi previsti dal GDPR puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei dati. Puoi opporti ai trattamenti fondati sul legittimo interesse per motivi legati alla tua situazione particolare. Per eventuali trattamenti basati sul consenso, puoi revocarlo senza pregiudicare la liceità del trattamento precedente.")}</p>
      <p>{t("Scrivi a") + " "}<a href={`mailto:${legal.email}`}>{legal.email}</a> {" " + t("indicando la richiesta e l’account interessato. Le richieste di cancellazione sono gestite manualmente dagli amministratori. Potrebbero essere necessarie informazioni proporzionate per verificare la tua identità. Il termine ordinario di risposta è un mese; se occorre una proroga nei casi consentiti, riceverai comunicazione entro lo stesso termine.")}</p>
      <p>{t("Puoi presentare un reclamo al") + " "}<a href="https://www.garanteprivacy.it/home/diritti/come-agire-per-tutelare-i-tuoi-dati-personali">{t("Garante per la protezione dei dati personali")}</a> {" " + t("o all’autorità di controllo competente, e rivolgerti all’autorità giudiziaria.")}</p>
    </section>

    <section aria-labelledby="cookie-link"><h2 id="cookie-link">{t("8. Cookie, collegamenti e aggiornamenti")}</h2>
      <p>{t("Consulta la") + " "}<Link href="/cookie">{t("Cookie policy")}</Link> {" " + t("per gli strumenti usati nel browser. Quando apri un collegamento a un negozio o a un altro sito, si applicano le informative di quel sito.")}</p>
      <p>{t("Questa pagina verrà aggiornata quando cambiano funzioni, fornitori o trattamenti; la data in alto identifica la versione. Le modifiche rilevanti saranno comunicate anche nel servizio quando necessario.")}</p>
    </section>
  </article>;
}
