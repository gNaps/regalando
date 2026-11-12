"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { ClerkLoaded, ClerkLoading, useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authError, type AuthOptions } from "@/lib/auth";
import { AuthFormSkeleton } from "./auth-form-skeleton";
import { AuthHeading, AuthSessionStatus, AuthSubmit, CodeField, PasswordField, Resend, checked, useAuthAction, useAuthNavigation, useStepFocus } from "./auth-controls";

type Step = "identifier" | "password" | "email" | "recovery" | "reset-code" | "new-password" | "mfa";
type Factor = "email_code" | "phone_code" | "totp" | "backup_code";
const factorNames: Record<Factor, string> = { email_code: "Codice via email", phone_code: "Codice via SMS", totp: "App di autenticazione", backup_code: "Codice di recupero" };

export function CustomSignIn({ options }: { options: AuthOptions }) {
  const { t } = useI18n();
  return <div className="auth-sign-in-stage">
    <div className="auth-sign-in-placeholder" aria-hidden="true" inert><AuthFormSkeleton social={options.social} announce={false} /></div>
    <ClerkLoading><p className="sr-only" role="status">{t("Caricamento dell’accesso…")}</p></ClerkLoading>
    <ClerkLoaded><div className="auth-sign-in-content"><SignInForm options={options} /></div></ClerkLoaded>
  </div>;
}

function SignInForm({ options }: { options: AuthOptions }) {
  const { t } = useI18n();
  const { signIn, errors } = useSignIn();
  const { busy, error, run, hasSession } = useAuthAction();
  const { navigate, link } = useAuthNavigation();
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [factor, setFactor] = useState<Factor | null>(null);
  const view = signIn.status === "needs_new_password" ? "new-password" : ["needs_second_factor", "needs_client_trust"].includes(signIn.status) ? "mfa" : step;
  const fields = useStepFocus(`${view}-${factor}`, busy);
  const emailFactor = signIn.supportedFirstFactors.find(value => value.strategy === "email_code");
  const mfaFactors = signIn.supportedSecondFactors.filter(value => value.strategy in factorNames);
  const message = error || (errors.raw?.[0] ? authError(errors.raw[0]) : "");
  async function advance() {
    if (signIn.status === "complete") await checked(signIn.finalize({ navigate }));
    else if (signIn.status === "needs_new_password") setStep("new-password");
    else if (["needs_second_factor", "needs_client_trust"].includes(signIn.status)) { setFactor(null); setStep("mfa"); }
    else if (signIn.status === "needs_protect_check") throw { code: "protect_check_required" };
  }
  async function sendEmail() {
    const currentFactor = signIn.supportedFirstFactors.find(value => value.strategy === "email_code");
    await checked(signIn.emailCode.sendCode(currentFactor?.strategy === "email_code" ? { emailAddressId: currentFactor.emailAddressId } : undefined));
    setStep("email");
  }
  async function sendFactor(choice: Factor) {
    if (choice === "email_code") await checked(signIn.mfa.sendEmailCode());
    if (choice === "phone_code") await checked(signIn.mfa.sendPhoneCode());
    setFactor(choice);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const code = String(data.get("code") || "").trim();
      if (view === "identifier") {
        const value = String(data.get("identifier")).trim(); setIdentifier(value);
        await checked(signIn.create({ identifier: value }));
        if (signIn.supportedFirstFactors.some(value => value.strategy === "password")) setStep("password");
        else if (signIn.supportedFirstFactors.some(value => value.strategy === "email_code")) await sendEmail();
        else throw { code: "unsupported_factor" };
      } else if (view === "password") { await checked(signIn.password({ password: String(data.get("password")) })); await advance(); }
      else if (view === "email") { await checked(signIn.emailCode.verifyCode({ code })); await advance(); }
      else if (view === "recovery") {
        await checked(signIn.create({ identifier: String(data.get("identifier")).trim() }));
        await checked(signIn.resetPasswordEmailCode.sendCode()); setStep("reset-code");
      } else if (view === "reset-code") { await checked(signIn.resetPasswordEmailCode.verifyCode({ code })); await advance(); }
      else if (view === "new-password") { await checked(signIn.resetPasswordEmailCode.submitPassword({ password: String(data.get("password")), signOutOfOtherSessions: true })); await advance(); }
      else if (view === "mfa" && factor) {
        if (factor === "email_code") await checked(signIn.mfa.verifyEmailCode({ code }));
        if (factor === "phone_code") await checked(signIn.mfa.verifyPhoneCode({ code }));
        if (factor === "totp") await checked(signIn.mfa.verifyTOTP({ code }));
        if (factor === "backup_code") await checked(signIn.mfa.verifyBackupCode({ code }));
        await advance();
      }
    });
  }
  async function restart() { await checked(signIn.reset()); setStep("identifier"); setFactor(null); }
  const heading = { identifier: t("Accedi"), password: t("Bentornato"), email: t("Controlla la tua email"), recovery: t("Recupera la password"), "reset-code": t("Controlla la tua email"), "new-password": t("Scegli una nuova password"), mfa: t("Un’ultima verifica") }[view];
  const description = { identifier: t("Ritrova i tuoi desideri e le persone con cui condividerli."), password: identifier || signIn.identifier || t("Inserisci la password del tuo account."), email: t("Inserisci il codice inviato all’email del tuo account."), recovery: t("Ti invieremo un codice per scegliere una nuova password."), "reset-code": t("Inserisci il codice ricevuto per recuperare la password."), "new-password": t("Usa una password che non hai già usato per altri account."), mfa: t("Conferma che sei tu per accedere in sicurezza.") }[view];
  if (hasSession) return <AuthSessionStatus busy={busy} error={t(error)} retry={() => run(async () => {})} />;
  return <div className="custom-auth"><AuthHeading title={heading}>{description}</AuthHeading>
    {view === "identifier" && options.social.length > 0 && <><div className="auth-social">{options.social.map(provider => <button key={provider.strategy} type="button" className="button secondary" disabled={busy} onClick={() => run(async () => { await checked(signIn.sso({ strategy: provider.strategy, redirectUrl: link("/sign-in/tasks"), redirectCallbackUrl: link("/sso-callback") })); })}>{t("Continua con") + " "}{provider.name}</button>)}</div><div className="auth-divider"><span>{t("oppure")}</span></div></>}
    <form className="form auth-form" onSubmit={submit} aria-busy={busy}>
      <fieldset ref={fields} disabled={busy} key={`${view}-${factor}`}>
        {(view === "identifier" || view === "recovery") && <label>{view === "recovery" ? t("Email") : t("Email o nome utente")}<input name="identifier" type={view === "recovery" ? "email" : "text"} required autoComplete="username" defaultValue={identifier} autoCapitalize="none" spellCheck={false} /></label>}
        {view === "password" && <><PasswordField /><button className="auth-text-button" type="button" onClick={() => setStep("recovery")}>{t("Hai dimenticato la password?")}</button></>}
        {view === "new-password" && <PasswordField label={t("Nuova password")} autoComplete="new-password" />}
        {["email", "reset-code"].includes(view) && <CodeField />}
        {view === "mfa" && !factor && <div className="auth-factor-choices">{mfaFactors.map(value => <button type="button" className="button secondary" key={value.strategy} onClick={() => run(() => sendFactor(value.strategy as Factor))}>{t(factorNames[value.strategy as Factor])}</button>)}{mfaFactors.length === 0 && <p>{t("Non è disponibile un metodo di verifica. Contatta l’assistenza.")}</p>}</div>}
        {view === "mfa" && factor && <><p className="auth-hint">{t(factorNames[factor])}</p><CodeField backup={factor === "backup_code"} /></>}
        {(view !== "mfa" || factor) && <AuthSubmit busy={busy}>{view === "identifier" ? t("Continua") : view === "recovery" ? t("Invia il codice") : view === "new-password" ? t("Salva e accedi") : t("Accedi")}</AuthSubmit>}
      </fieldset>
      {message && <p className="form-error" role="alert">{t(message)}</p>}
    </form>
    {view === "password" && emailFactor && <button className="auth-text-button" disabled={busy} onClick={() => run(sendEmail)}>{t("Accedi con un codice via email")}</button>}
    {view === "email" && <Resend busy={busy} send={() => run(sendEmail)} />}
    {view === "reset-code" && <Resend busy={busy} send={() => run(async () => { await checked(signIn.resetPasswordEmailCode.sendCode()); })} />}
    {view === "mfa" && factor && <>{["email_code", "phone_code"].includes(factor) && <Resend busy={busy} send={() => run(() => sendFactor(factor))} />}<button className="auth-text-button" disabled={busy} onClick={() => setFactor(null)}>{t("Scegli un altro metodo")}</button></>}
    {view !== "identifier" && <button className="auth-text-button" disabled={busy} onClick={() => run(restart)}>{t("Torna all’accesso")}</button>}
    <p className="auth-switch">{t("Non hai ancora un account?") + " "}<Link href={link("/sign-up")}>{t("Registrati")}</Link></p>
    <div id="clerk-captcha" />
  </div>;
}
