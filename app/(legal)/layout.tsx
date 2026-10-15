import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { getI18n } from "@/lib/i18n-server";
import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "../components/ui/brand";
import { LegalLinks } from "../components/ui/legal-links";
import { legal } from "@/lib/legal";

export default async function LegalLayout({ children }: { children: ReactNode }) {
  const { t, locale } = await getI18n();
  return <div className="legal-page">
    <a className="skip-link" href="#legal-content">{t("Vai al contenuto")}</a>
    <header className="legal-header"><Brand href="/" /><LanguageSwitcher /><Link href="/">{t("Torna alla home")}</Link></header>
    <main id="legal-content" className="legal-content" tabIndex={-1}>
      <div className="legal-meta"><span className="eyebrow">{t("INFORMAZIONI LEGALI")}</span><span>{t("Ultimo aggiornamento:") + " "}<time dateTime={legal.updatedAt}>{new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${legal.updatedAt}T12:00:00`))}</time></span></div>
      {children}
    </main>
    <footer className="app-footer"><span className="brand-tagline">{t("Quello che ami, per chi ti ama.")}</span><LegalLinks /></footer>
  </div>;
}
