"use client";

import { ArrowRight } from "lucide-react";
import { useI18n } from "@/app/providers/LocaleProvider";
import type { AuthOptions } from "@/lib/auth";

const defaultSocial: AuthOptions["social"] = [{ strategy: "oauth_google", name: "Google" }];

// Independent of Clerk: this also renders while the server is preparing the page.
export function AuthFormSkeleton({ social = defaultSocial, neutral = false, announce = true }: {
  social?: AuthOptions["social"];
  neutral?: boolean;
  announce?: boolean;
}) {
  const { t } = useI18n();
  return <div className="custom-auth auth-sign-in-loading">
    {announce && <p className="sr-only" role="status">{t("Caricamento dell’accesso…")}</p>}
    <div aria-hidden="true" inert>
      <div className="auth-heading">
        <span className="eyebrow">{t("IL TUO SPAZIO, SU REGALANDO")}</span>
        {neutral ? <><div className="auth-skeleton-title" /><div className="auth-skeleton-description" /></> : <><h1>{t("Accedi")}</h1><p>{t("Ritrova i tuoi desideri e le persone con cui condividerli.")}</p></>}
      </div>
      {social.length > 0 && <><div className="auth-social">{social.map(provider => <button key={provider.strategy} type="button" className="button secondary" disabled>{t("Continua con") + " "}{provider.name}</button>)}</div><div className="auth-divider"><span>{t("oppure")}</span></div></>}
      <div className="form auth-form"><fieldset disabled>
        <div className="auth-loading-field">{t("Email o nome utente")}<span className="auth-loading-input" /></div>
        <button className="button primary auth-submit" type="button" disabled>{t("Continua")}<ArrowRight size={17} /></button>
      </fieldset></div>
      <p className="auth-switch">{t("Non hai ancora un account?") + " "}<span className="auth-loading-link">{t("Registrati")}</span></p>
    </div>
  </div>;
}
