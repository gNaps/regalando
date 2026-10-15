import { getI18n } from "@/lib/i18n-server";
import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
  title: t("Cookie policy"),
  description: t("Informazioni sui cookie tecnici di Regalando, sull’autenticazione e sulle impostazioni del browser."),
};
}

export default async function CookiePage() {
  const { t } = await getI18n();
  return <article className="legal-document">
    <h1>{t("Cookie policy")}</h1>
    <p className="legal-intro">{t("Qui trovi le informazioni sugli strumenti che permettono al browser di ricordare il tuo accesso a Regalando.")}</p>
    <section aria-labelledby="cosa-sono"><h2 id="cosa-sono">{t("1. Cosa sono i cookie")}</h2>
      <p>{t("I cookie sono piccoli dati salvati nel browser e inviati al sito nelle richieste successive. Possono durare una sessione o restare fino alla scadenza prevista. Anche altre tecnologie, come la memoria locale del browser, possono conservare informazioni sul dispositivo.")}</p>
    </section>
    <section aria-labelledby="utilizzo"><h2 id="utilizzo">{t("2. Come li usa Regalando")}</h2>
      <p>{t("La versione attuale integra l’autenticazione di Clerk per creare un account, accedere e mantenere la sessione. Il codice dell’app non integra strumenti di pubblicità, profilazione commerciale o analisi del traffico. Immagini e font della landing sono serviti dal sito.")}</p>
      <p>{t("La landing e le pagine delle informative non caricano il componente di autenticazione. Le pagine di registrazione, accesso, invito e area personale integrano Clerk, anche per riconoscere eventuali account già connessi. Entrare come ospite non crea un account Clerk. Eventuali cookie già presenti possono comunque essere inviati dal browser al relativo dominio.")}</p>
    </section>
    <section aria-labelledby="ospiti"><h2 id="ospiti">{t("Memoria locale per l’accesso ospite")}</h2>
      <p>{t("Quando scegli «Accedi come ospite», Regalando salva una credenziale tecnica nella memoria locale del browser, con una chiave che inizia con") + " "}<code>regalando:guest:</code>{t(". Serve a riconoscere le tue prenotazioni nella lista e a permetterti di annullarle nello stesso browser. Il nome richiesto per prenotare viene conservato nel database, non in questa chiave.")}</p>
      <p>{t("Il dato è limitato al sito e al browser utilizzato e resta fino alla cancellazione dei dati del sito, senza scadenza automatica. Non serve a pubblicità o analisi del traffico. Da un altro dispositivo il link ti permette di rivedere la lista, ma non di annullare le prenotazioni associate al browser precedente.")}</p>
    </section>
    <section aria-labelledby="lingua"><h2 id="lingua">{t("Preferenza della lingua")}</h2><p>{t("Regalando salva la lingua scelta nel cookie tecnico regalando-locale per un anno. Serve solo a mantenere italiano o inglese tra le visite e viene aggiornato quando cambi lingua dal selettore. Non è usato per pubblicità o analisi. Cancellandolo, torna a essere utilizzata la lingua del browser, se supportata.")}</p></section>
    <section aria-labelledby="strumenti"><h2 id="strumenti">{t("3. Cookie per l’autenticazione")}</h2>
      <p>{t("Clerk documenta, tra gli altri, i seguenti cookie tecnici. Questo elenco descrive il fornitore integrato e deve essere completato con l’inventario del dominio di produzione: nomi effettivi, eventuali suffissi, domini, scadenze e altri strumenti dipendono dalla configurazione.")}</p>
      <dl className="legal-cookie-list">
        <div><dt><code>__session</code></dt><dd>{t("Consente di autenticare le richieste tramite il token di sessione.")}</dd></div>
        <div><dt><code>__client_uat</code></dt><dd>{t("Supporta il riconoscimento dello stato di accesso e l’aggiornamento della sessione.")}</dd></div>
        <div><dt><code>__client</code></dt><dd>{t("È usato dal servizio Clerk per riconoscere il client e gestire i token di sessione.")}</dd></div>
      </dl>
      <p><strong>{t("Durata e domini:")}</strong> {" " + t("da verificare nell’ambiente di produzione, sia prima sia dopo l’accesso. La breve validità di un token non coincide necessariamente con la durata del cookie o dell’accesso: per questo non indichiamo una scadenza non verificata.")}</p>
      <p>{t("Ulteriori informazioni sono disponibili nella") + " "}<a href="https://clerk.com/docs/guides/how-clerk-works/cookies">{t("documentazione sui cookie di Clerk")}</a> {" " + t("e nella sua") + " "}<a href="https://clerk.com/legal/privacy">{t("informativa privacy")}</a>.</p>
    </section>
    <section aria-labelledby="consenso"><h2 id="consenso">{t("4. Consenso e preferenze")}</h2>
      <p>{t("I cookie strettamente necessari a fornire un servizio richiesto dall’utente non richiedono un consenso preventivo, ma devono essere descritti nell’informativa. Per questo, la configurazione attuale non presenta un banner per accettare cookie facoltativi.")}</p>
      <p>{t("Prima di introdurre strumenti che richiedano consenso, Regalando dovrà informarti e permetterti di scegliere se attivarli e di modificare o revocare la scelta. L’inventario definitivo deve includere anche eventuali strumenti aggiunti dall’hosting o dalle impostazioni dei fornitori.")}</p>
      <p>{t("Il riferimento è costituito dalle") + " "}<a href="https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876">{t("linee guida del Garante su cookie e altri strumenti di tracciamento")}</a>.</p>
    </section>
    <section aria-labelledby="browser"><h2 id="browser">{t("5. Come gestirli nel browser")}</h2>
      <p>{t("Puoi consultare, cancellare o bloccare i cookie dalle impostazioni di privacy del tuo browser, anche per il singolo sito. Bloccare quelli necessari all’autenticazione può impedire l’accesso o richiedere di accedere nuovamente. Cancellare i cookie non elimina l’account o le liste conservate nell’app.")}</p>
    </section>
    <section aria-labelledby="contatti"><h2 id="contatti">{t("6. Contatti e diritti")}</h2>
      <p>{t("Il titolare è") + " "}{legal.controller}{t(", con recapito postale in") + " "}{legal.address}{t(", contattabile a") + " "}<a href={`mailto:${legal.email}`}>{legal.email}</a>{t(". Per i dati trattati, i fornitori, la conservazione e i tuoi diritti consulta la") + " "}<Link href="/privacy">{t("Privacy policy")}</Link>.</p>
    </section>
  </article>;
}
