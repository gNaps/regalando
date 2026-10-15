"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { ClerkLoaded, ClerkLoading, useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authError, type AuthOptions } from "@/lib/auth";
import { AuthHeading, AuthSessionStatus, AuthSubmit, CodeField, PasswordField, Resend, checked, useAuthAction, useAuthNavigation, useStepFocus } from "./auth-controls";

export function CustomSignUp({ options }: { options: AuthOptions }) {
  const { t } = useI18n();
  return <><ClerkLoading><AuthHeading title={t("Crea il tuo account")}>{t("Un posto per quello che ami, da condividere con chi ti ama.")}</AuthHeading><p role="status">{t("Caricamento della registrazione…")}</p></ClerkLoading><ClerkLoaded><SignUpForm options={options} /></ClerkLoaded></>;
}

function SignUpForm({ options }: { options: AuthOptions }) {
  const { t } = useI18n();
  const { signUp, errors } = useSignUp();
  const { busy, error, run, hasSession } = useAuthAction();
  const { navigate, link } = useAuthNavigation();
  const [codeSent, setCodeSent] = useState(false);
  const message = error || (errors.raw?.[0] ? authError(errors.raw[0]) : "");
  const pending = Boolean(signUp.id && !signUp.canBeDiscarded);
  const verifying = pending && signUp.missingFields.length === 0 && signUp.unverifiedFields.includes("email_address");
  const fields = useStepFocus(verifying ? "verify" : "details", busy);
  const needs = (field: string, enabled: boolean) => pending ? signUp.missingFields.some(value => value === field) : enabled;
  async function finish() {
    if (signUp.status === "complete") await checked(signUp.finalize({ navigate }));
    else if (signUp.unverifiedFields.includes("email_address") && signUp.missingFields.length === 0) {
      await checked(signUp.verifications.sendEmailCode()); setCodeSent(true);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      if (verifying) {
        await checked(signUp.verifications.verifyEmailCode({ code: String(data.get("code")).trim() }));
        if (signUp.status === "complete") await checked(signUp.finalize({ navigate }));
      } else {
        const value = (name: string) => data.has(name) ? String(data.get(name)).trim() : undefined;
        const params = { emailAddress: value("email"), username: value("username"), firstName: value("firstName"), lastName: value("lastName"), password: data.has("password") ? String(data.get("password")) : undefined };
        if (pending) await checked(signUp.update(params));
        else await checked(signUp.create(params));
        await finish();
      }
    });
  }
  if (options.signupMode === "restricted" && !pending) return <div className="custom-auth"><AuthHeading title={t("Registrazione su invito")}>{t("Per creare un account serve un invito. Se hai già un account, puoi accedere.")}</AuthHeading><Link className="button primary" href={link("/sign-in")}>{t("Accedi")}</Link></div>;
  if (hasSession) return <AuthSessionStatus busy={busy} error={t(error)} retry={() => run(async () => {})} />;
  return <div className="custom-auth"><AuthHeading title={verifying ? t("Verifica la tua email") : pending ? t("Completa il tuo account") : t("Crea il tuo account")}>{verifying ? t("Inserisci il codice inviato a {0}.", { "0": signUp.emailAddress || t("la tua email") }) : t("Un posto per quello che ami, da condividere con chi ti ama.")}</AuthHeading>
    {!pending && options.social.length > 0 && <><div className="auth-social">{options.social.map(provider => <button key={provider.strategy} className="button secondary" type="button" disabled={busy} onClick={() => run(async () => { await checked(signUp.sso({ strategy: provider.strategy, redirectUrl: link("/sign-in/tasks"), redirectCallbackUrl: link("/sso-callback") })); })}>{t("Continua con") + " "}{provider.name}</button>)}</div><div className="auth-divider"><span>{t("oppure")}</span></div></>}
    <form className="form auth-form" onSubmit={submit} aria-busy={busy}><fieldset ref={fields} disabled={busy} key={verifying ? "verify" : "details"}>
      {verifying ? <>{!codeSent && <button className="button secondary" type="button" onClick={() => run(async () => { await checked(signUp.verifications.sendEmailCode()); setCodeSent(true); })}>{t("Invia il codice di verifica")}</button>}<CodeField /></> : <>
        {needs("email_address", true) && <label>{t("Email")}<input name="email" type="email" required autoComplete="email" autoCapitalize="none" defaultValue={signUp.emailAddress || ""} /></label>}
        {needs("username", options.username.enabled) && <label>{t("Nome utente")}<input name="username" required={options.username.required || pending} autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={signUp.username || ""} /><small>{t("Il nome con cui sarai riconoscibile su Regalando.")}</small></label>}
        {(needs("first_name", options.firstName.enabled) || needs("last_name", options.lastName.enabled)) && <div className="auth-name-fields">{needs("first_name", options.firstName.enabled) && <label>{t("Nome")}{!options.firstName.required && <span className="auth-optional"> {" " + t("· facoltativo")}</span>}<input name="firstName" required={options.firstName.required} autoComplete="given-name" defaultValue={signUp.firstName || ""} /></label>}{needs("last_name", options.lastName.enabled) && <label>{t("Cognome")}{!options.lastName.required && <span className="auth-optional"> {" " + t("· facoltativo")}</span>}<input name="lastName" required={options.lastName.required} autoComplete="family-name" defaultValue={signUp.lastName || ""} /></label>}</div>}
        {needs("password", options.password.enabled) && <PasswordField autoComplete="new-password" />}
      </>}
      <AuthSubmit busy={busy}>{verifying ? t("Verifica e continua") : t("Crea account")}</AuthSubmit>
    </fieldset>{message && <p role="alert" className="form-error">{t(message)}</p>}<div id="clerk-captcha" /></form>
    {verifying && <><Resend busy={busy} send={() => run(async () => { await checked(signUp.verifications.sendEmailCode()); setCodeSent(true); })} /><button type="button" className="auth-text-button" disabled={busy} onClick={() => run(async () => { await checked(signUp.reset()); setCodeSent(false); })}>{t("Cambia i dati di registrazione")}</button></>}
    {!verifying && <p className="auth-privacy">{t("Scopri come trattiamo i tuoi dati nella") + " "}<Link href="/privacy">{t("Privacy policy")}</Link>.</p>}
    <p className="auth-switch">{t("Hai già un account?") + " "}<Link href={link("/sign-in")}>{t("Accedi")}</Link></p>
  </div>;
}
