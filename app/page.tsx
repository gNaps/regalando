import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { getI18n } from "@/lib/i18n-server";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Bookmark, EyeOff, Heart, Link2, ListChecks, MessageCircle, Plus, Users, Wallet } from "lucide-react";
import { Brand } from "./components/ui/brand";
import { DesireSculpture } from "./components/ui/artwork";
import { LandingMotion } from "./components/ui/landing-motion";
import { LegalLinks } from "./components/ui/legal-links";
import wishlistSilver from "@/public/images/wishlist-silver.png";
import wishlistNight from "@/public/images/wishlist-night.png";

export default async function Home() {
  const { t } = await getI18n();
  return <div className="landing-page">
    <LandingMotion />
    <a className="skip-link" href="#landing-content">{t("Vai al contenuto")}</a>
    <header className="landing-header">
      <Brand href="/" />
      <nav className="landing-header-actions" aria-label={t("Navigazione principale")}>
        <a href="#perche-regalando" className="landing-how-link">{t("Perché Regalando")}</a>
        <a href="#come-funziona" className="landing-how-link">{t("Come funziona")}</a>
        <a href="#faq" className="landing-how-link">{t("FAQ")}</a>
        <LanguageSwitcher />
        <Link href="/lists" className="landing-login">{t("Accedi") + " "}<ArrowUpRight size={16} /></Link>
      </nav>
    </header>
    <main id="landing-content">
      <section className="landing-hero" aria-labelledby="landing-title">
        <span className="landing-coordinate brand-tagline" aria-hidden="true">{t("Quello che ami, per chi ti ama.")}</span>
        <div className="landing-hero-copy">
          <span className="eyebrow"><span className="intro-dot" />{t("LA TUA LISTA DESIDERI")}</span>
          <h1 id="landing-title">{t("Il regalo giusto")}{" "}<br /><span>{t("comincia")}</span>{" "}<br /><em>{t("da te.")}</em></h1>
          <p>{t("Raccogli ciò che ti piacerebbe ricevere in una lista regalo, con prezzi, dettagli e dove trovarlo. Per dare a chi ti vuole bene un’idea da cui partire.")}</p>
          <Link href="/sign-up" className="button primary landing-start">{t("Crea la tua prima lista") + " "}<span><ArrowUpRight size={21} /></span></Link>
          <span className="landing-cta-note">{t("Un libro, un oggetto speciale, un’esperienza. Scegli tu.")}</span>
        </div>
        <DesireSculpture />
        <a className="landing-discover" href="#perche-regalando"><span>{t("SCOPRI REGALANDO")}</span><ArrowDown size={16} /></a>
      </section>

      <section className="landing-benefits" id="perche-regalando" aria-labelledby="benefits-title">
        <div className="landing-benefits-intro">
          <div className="landing-section-heading" data-reveal>
            <span className="eyebrow">{t("PERCHÉ REGALANDO")}</span>
            <h2 id="benefits-title">{t("Meno dubbi per chi regala.")}<br /><span>{t("Più felicità per chi riceve.")}</span></h2>
            <p>{t("Un regalo riuscito parte da un desiderio vero. Regalando ti aiuta a raccoglierlo, senza perdere i dettagli che fanno la differenza.")}</p>
          </div>
          <div className="landing-scene landing-scene-home" data-reveal data-reveal-delay="1">
            <Image src={wishlistSilver} alt={t("Libri e un vaso argentato con un nastro dorato, idee regalo per chi ama leggere e arredare.")} sizes="(max-width: 760px) 100vw, (max-width: 1192px) 55vw, 650px" placeholder="blur" />
          </div>
        </div>
        <div className="landing-benefit-grid">
          <article data-reveal>
            <Heart size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("PER CHI RICEVE")}</span>
            <h3>{t("Regali che ti somigliano.")}</h3>
            <p>{t("Il libro che vuoi leggere, il colore che preferisci, l’esperienza che sogni. Una lista racconta i tuoi gusti meglio di un «fai tu».")}</p>
          </article>
          <article data-reveal data-reveal-delay="1">
            <Wallet size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("PER CHI REGALA")}</span>
            <h3>{t("Un’idea per ogni budget.")}</h3>
            <p>{t("Aggiungi desideri di prezzi diversi e un costo indicativo. Dai a chi vuole farti un regalo più possibilità di trovare il pensiero giusto.")}</p>
          </article>
          <article data-reveal>
            <Bookmark size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("QUANDO TROVI QUALCOSA DI BELLO")}</span>
            <h3>{t("Nessuna idea dimenticata.")}</h3>
            <p>{t("Incolla il link di un prodotto e nome, prezzo e descrizione si compilano da soli. Link, negozi e dettagli rimangono insieme, pronti per la prossima occasione.")}</p>
          </article>
          <article data-reveal data-reveal-delay="1">
            <ListChecks size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("QUANDO CONTANO I DETTAGLI")}</span>
            <h3>{t("Meno ricerche, più certezze.")}</h3>
            <p>{t("Specifica modello, taglia e dove acquistare. Tutte le informazioni utili in un posto solo, senza doverle recuperare tra messaggi e appunti.")}</p>
          </article>
          <article data-reveal>
            <Users size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("PER CHI REGALA INSIEME")}</span>
            <h3>{t("In tanti per un regalo grande.")}</h3>
            <p>{t("Un desiderio importante non spaventa nessuno: chi lo sceglie può proporre di dividere la spesa e gli altri aderiscono con la loro quota. Tu non saprai nulla fino al giorno giusto.")}</p>
          </article>
          <article data-reveal data-reveal-delay="1">
            <MessageCircle size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("PER METTERSI D’ACCORDO")}</span>
            <h3>{t("Note che restano tra amici.")}</h3>
            <p>{t("Colore, taglia, chi compra e chi incarta: gli invitati si coordinano con note su ogni regalo, visibili solo a loro. Mai a te.")}</p>
          </article>
        </div>
      </section>

      <section className="landing-story" id="come-funziona" aria-labelledby="story-title">
        <div className="landing-section-heading" data-reveal>
          <span className="eyebrow">{t("COME FUNZIONA")}</span>
          <h2 id="story-title">{t("Tu metti i desideri.")}<br /><span>{t("Al bel pensiero ci pensano loro.")}</span></h2>
          <p>{t("Crea la tua lista, condividila con chi vuoi e lascia che ognuno scelga un regalo. La sorpresa resta al sicuro.")}</p>
        </div>
        <div className="landing-steps">
          <article data-reveal><div className="landing-step-top"><span>01</span><Heart size={21} strokeWidth={1.5} aria-hidden="true" /></div><h3>{t("Raccogli ciò che ami.")}</h3><p>{t("Crea una lista e aggiungi i tuoi desideri: un prezzo indicativo, i dettagli che contano e un link o un negozio dove trovarli.")}</p></article>
          <article data-reveal data-reveal-delay="1"><div className="landing-step-top"><span>02</span><Link2 size={21} strokeWidth={1.5} aria-hidden="true" /></div><h3>{t("Fai spazio a chi ti vuole bene.")}</h3><p>{t("Invita amici e famiglia con un link: possono entrare anche senza account. Le tue idee sono tutte lì, senza doverti chiedere «cosa ti regalo?».")}</p></article>
          <article data-reveal data-reveal-delay="2"><div className="landing-step-top"><span>03</span><EyeOff size={21} strokeWidth={1.5} aria-hidden="true" /></div><h3>{t("Lascia a loro la sorpresa.")}</h3><p>{t("Gli invitati prenotano i regali per evitare doppioni, o si uniscono per un regalo di gruppo. La tua vista della lista non mostra scelte, quote o note, così la sorpresa resta intatta.")}</p></article>
        </div>
      </section>

      <section className="landing-occasions" aria-labelledby="occasions-title">
        <div className="landing-scene landing-scene-gifts" data-reveal>
          <Image src={wishlistNight} alt={t("Cuffie argentate accanto a un pacco regalo nero con un fiocco dorato.")} sizes="(max-width: 760px) 100vw, (max-width: 1192px) 55vw, 650px" placeholder="blur" />
        </div>
        <div className="landing-occasions-copy" data-reveal data-reveal-delay="1"><span className="eyebrow">{t("OGNI OCCASIONE, UNA LISTA")}</span><h2 id="occasions-title">{t("Per i giorni speciali.")}<br /><span>{t("E per i desideri di tutti i giorni.")}</span></h2><p>{t("Un compleanno in arrivo, i regali di Natale, un traguardo da festeggiare. Oppure solo un posto in cui conservare le cose che ami.")}</p><ul className="landing-occasion-tags" aria-label={t("Idee per le tue liste")}><li>{t("Compleanni")}</li><li>{t("Natale")}</li><li>{t("Lauree")}</li><li>{t("Desideri di ogni giorno")}</li></ul></div>
      </section>

      <section className="landing-faq" id="faq" aria-labelledby="faq-title">
        <div className="landing-section-heading" data-reveal>
          <span className="eyebrow">{t("DOMANDE FREQUENTI")}</span>
          <h2 id="faq-title">{t("Qualche dubbio?")}<br /><span>{t("Facciamo chiarezza.")}</span></h2>
          <p>{t("Tutto quello che serve sapere prima di esprimere il primo desiderio.")}</p>
        </div>
        <div className="landing-faq-items" data-reveal>
          <details className="landing-faq-item">
            <summary><span>{t("Serve un account per usare Regalando?")}</span><Plus size={18} aria-hidden="true" /></summary>
            <p>{t("Per creare e gestire le tue liste serve un account. Chi riceve il tuo link di invito può partecipare anche come ospite, senza registrarsi.")}</p>
          </details>
          <details className="landing-faq-item">
            <summary><span>{t("Che cosa posso aggiungere alla mia lista?")}</span><Plus size={18} aria-hidden="true" /></summary>
            <p>{t("Oggetti, libri, esperienze o qualsiasi cosa ti piacerebbe ricevere. Puoi indicare un prezzo, aggiungere dettagli come taglia e colore e inserire un link o il nome di un negozio.")}</p>
          </details>
          <details className="landing-faq-item">
            <summary><span>{t("Come si evitano i regali doppioni?")}</span><Plus size={18} aria-hidden="true" /></summary>
            <p>{t("Gli invitati possono prenotare un regalo dalla lista. Gli altri partecipanti vedono che è già stato scelto e possono orientarsi su un altro desiderio.")}</p>
          </details>
          <details className="landing-faq-item">
            <summary><span>{t("Chi crea la lista può vedere i regali prenotati?")}</span><Plus size={18} aria-hidden="true" /></summary>
            <p>{t("Nella vista di chi crea la lista non compaiono prenotazioni, quote o note degli invitati. Puoi continuare a gestire i tuoi desideri senza scoprire cosa hanno scelto per te.")}</p>
          </details>
          <details className="landing-faq-item">
            <summary><span>{t("Possiamo fare un regalo di gruppo?")}</span><Plus size={18} aria-hidden="true" /></summary>
            <p>{t("Sì. Chi sceglie un regalo può proporre di dividerne la spesa. Gli altri invitati possono aderire e indicare una quota, poi usare le note del regalo per organizzarsi tra loro.")}</p>
          </details>
          <details className="landing-faq-item">
            <summary><span>{t("Si acquistano i regali direttamente su Regalando?")}</span><Plus size={18} aria-hidden="true" /></summary>
            <p>{t("No. Regalando ti aiuta a raccogliere desideri e a organizzare i regali. Gli acquisti e gli eventuali pagamenti tra amici avvengono fuori dall’app: le quote indicate servono solo per mettersi d’accordo.")}</p>
          </details>
        </div>
      </section>

      <section className="landing-invitation" aria-labelledby="invitation-title" data-reveal>
        <span className="eyebrow">{t("IL PROSSIMO BEL PENSIERO")}</span>
        <h2 id="invitation-title">{t("Cosa ti farebbe") + " "}<em>{t("felice?")}</em></h2>
        <p className="landing-invitation-description">{t("Parti da un desiderio. La tua lista prende forma un’idea alla volta.")}</p>
        <Link href="/sign-up" className="button primary">{t("Crea la tua prima lista") + " "}<ArrowUpRight size={19} /></Link>
        <p>{t("Hai già un account?") + " "}<Link href="/lists">{t("Entra in Regalando") + " "}<ArrowUpRight size={13} /></Link></p>
      </section>
    </main>
    <footer className="landing-footer"><Brand href="/" /><span className="brand-tagline">{t("Quello che ami, per chi ti ama.")}</span><div className="landing-footer-links"><LegalLinks /><Link href="/lists">{t("Accedi all’app") + " "}<ArrowUpRight size={14} /></Link></div></footer>
  </div>;
}
