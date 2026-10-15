"use client";

import { LanguageSwitcher } from "@/app/components/ui/language-switcher";

import { useI18n } from "@/app/providers/LocaleProvider";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { LegalLinks } from "./legal-links";
import { WorkspaceNav } from "./workspace-nav";

export function AppShell({ children, account }: { children: ReactNode; account: ReactNode }) {
  const { t } = useI18n();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t("Vai al contenuto")}</a>
    <header className="app-header"><div className="header-inner"><Brand /><WorkspaceNav /><div className="header-account"><LanguageSwitcher /><div className="account-control">{account}</div></div></div></header>
    <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
    <footer className="app-footer"><span className="brand-tagline">{t("Quello che ami, per chi ti ama.")}</span><LegalLinks /></footer>
  </div>;
}
