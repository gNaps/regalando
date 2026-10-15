import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { getI18n } from "@/lib/i18n-server";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Bookmark, EyeOff, Heart, Link2, ListChecks, Wallet } from "lucide-react";
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
            <p>{t("Raccogli i desideri durante l’anno. Link, negozi e dettagli rimangono insieme, pronti per la prossima occasione.")}</p>
          </article>
          <article data-reveal data-reveal-delay="1">
            <ListChecks size={23} strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow">{t("QUANDO CONTANO I DETTAGLI")}</span>
            <h3>{t("Meno ricerche, più certezze.")}</h3>
            <p>{t("Specifica modello, taglia e dove acquistare. Tutte le informazioni utili in un posto solo, senza doverle recuperare tra messaggi e appunti.")}</p>
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
          <article data-reveal data-reveal-delay="2"><div className="landing-step-top"><span>03</span><EyeOff size={21} strokeWidth={1.5} aria-hidden="true" /></div><h3>{t("Lascia a loro la sorpresa.")}</h3><p>{t("Gli invitati prenotano i regali per evitare doppioni. La tua vista della lista non mostra le loro scelte, così la sorpresa resta intatta.")}</p></article>
        </div>
      </section>

      <section className="landing-occasions" aria-labelledby="occasions-title">
        <div className="landing-scene landing-scene-gifts" data-reveal>
          <Image src={wishlistNight} alt={t("Cuffie argentate accanto a un pacco regalo nero con un fiocco dorato.")} sizes="(max-width: 760px) 100vw, (max-width: 1192px) 55vw, 650px" placeholder="blur" />
        </div>
        <div className="landing-occasions-copy" data-reveal data-reveal-delay="1"><span className="eyebrow">{t("OGNI OCCASIONE, UNA LISTA")}</span><h2 id="occasions-title">{t("Per i giorni speciali.")}<br /><span>{t("E per i desideri di tutti i giorni.")}</span></h2><p>{t("Un compleanno in arrivo, i regali di Natale, un traguardo da festeggiare. Oppure solo un posto in cui conservare le cose che ami.")}</p><ul className="landing-occasion-tags" aria-label={t("Idee per le tue liste")}><li>{t("Compleanni")}</li><li>{t("Natale")}</li><li>{t("Lauree")}</li><li>{t("Desideri di ogni giorno")}</li></ul></div>
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
