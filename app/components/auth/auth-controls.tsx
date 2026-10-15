"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClerk, useSessionList } from "@clerk/nextjs";
import type { SignInFutureFinalizeParams } from "@clerk/nextjs/types";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { authError, authRedirect } from "@/lib/auth";

export async function checked(action: Promise<{ error: unknown }>) {
  const { error } = await action;
  if (error) throw error;
}

export function useStepFocus(step: string, busy: boolean) {
  const fields = useRef<HTMLFieldSetElement>(null);
  const previous = useRef(step);
  useEffect(() => {
    if (busy || step === previous.current) return;
    previous.current = step;
    fields.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [step, busy]);
  return fields;
}

export function useAuthAction() {
  const clerk = useClerk();
  const { isLoaded, sessions } = useSessionList();
  const { navigate } = useAuthNavigation();
  const lock = useRef(false);
  const resumed = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionId = sessions?.find(session => session.id === clerk.client?.lastActiveSessionId && ["active", "pending"].includes(session.status))?.id
    ?? sessions?.find(session => ["active", "pending"].includes(session.status))?.id;
  const run = useCallback(async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    async function resume() {
      const client = clerk.client;
      const available = client?.signedInSessions;
      const session = available?.find(value => value.id === client?.lastActiveSessionId) ?? available?.[0];
      if (!session) return false;
      resumed.current = session.id;
      await clerk.setActive({ session: session.id, navigate });
      return true;
    }
    try {
      if (!await resume()) await action();
    } catch (cause) {
      // The browser can discover an existing session only when the API responds.
      if (authErrorCode(cause) === "session_exists") {
        try {
          await clerk.client?.reload();
          if (!await resume()) setError(authError(cause));
        } catch (recoveryError) { setError(authError(recoveryError)); }
      } else setError(authError(cause));
    }
    finally { lock.current = false; setBusy(false); }
  }, [clerk, navigate]);
  useEffect(() => {
    if (isLoaded && sessionId && resumed.current !== sessionId) void run(async () => {});
  }, [isLoaded, sessionId, run]);
  return { busy, error, run, hasSession: Boolean(sessionId) };
}

export function useAuthNavigation() {
  const router = useRouter();
  const query = useSearchParams();
  const redirect = query.get("redirect_url");
  const navigate = useCallback<NonNullable<SignInFutureFinalizeParams["navigate"]>>(({ session, decorateUrl }) => {
    const target = authRedirect(redirect, window.location.origin);
    const url = decorateUrl(session?.currentTask ? `/sign-in/tasks?redirect_url=${encodeURIComponent(target)}` : target);
    if (url.startsWith("http")) window.location.assign(url);
    else router.replace(url);
  }, [router, redirect]);
  const link = useCallback((path: string) => `${path}${redirect ? `?redirect_url=${encodeURIComponent(redirect)}` : ""}`, [redirect]);
  return { navigate, link };
}

function authErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const value = error as { code?: string; errors?: { code?: string }[]; cause?: unknown };
  const code = value.errors?.[0]?.code || value.code || "";
  return code === "session_exists" || !value.cause || value.cause === error ? code : authErrorCode(value.cause);
}

export function AuthSessionStatus({ busy, error, retry }: { busy: boolean; error: string; retry: () => Promise<void> }) {
  const { t } = useI18n();
  return <><AuthHeading title={t("Ti stiamo facendo entrare")}>{t("Stiamo riprendendo la tua sessione.")}</AuthHeading>{error ? <><p className="form-error" role="alert">{t(error)}</p><button className="button secondary" type="button" disabled={busy} onClick={retry}>{t("Riprova")}</button></> : <p role="status">{t("Un momento…")}</p>}</>;
}

export function PasswordField({ label = "Password", name = "password", autoComplete = "current-password" }: { label?: string; name?: string; autoComplete?: string }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const id = useId();
  return <div><label htmlFor={id}>{t(label)}</label><span className="auth-password"><input id={id} name={name} type={visible ? "text" : "password"} required autoComplete={autoComplete} /><button type="button" aria-label={visible ? t("Nascondi password") : t("Mostra password")} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></div>;
}

export function AuthHeading({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return <div className="auth-heading"><span className="eyebrow">{t("IL TUO SPAZIO, SU REGALANDO")}</span><h1>{title}</h1><p>{children}</p></div>;
}

export function AuthSubmit({ busy, children }: { busy: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return <button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? t("Un momento…") : children}<ArrowRight size={17} aria-hidden="true" /></button>;
}

export function CodeField({ backup = false }: { backup?: boolean }) {
  const { t } = useI18n();
  return <label>{backup ? t("Codice di recupero") : t("Codice di verifica")}<input className="auth-code" name="code" required autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} pattern={backup ? undefined : "[0-9]{6}"} maxLength={backup ? undefined : 6} /></label>;
}

export function Resend({ busy, send }: { busy: boolean; send: () => Promise<void> }) {
  const { t } = useI18n();
  const [until, setUntil] = useState(0);
  const [waiting, setWaiting] = useState(false);
  return <button type="button" className="auth-text-button" disabled={busy || waiting} onClick={async () => {
    if (Date.now() < until) return;
    await send(); setUntil(Date.now() + 30_000); setWaiting(true);
    window.setTimeout(() => setWaiting(false), 30_000);
  }}>{waiting ? t("Puoi richiedere un altro codice tra 30 secondi") : t("Non è arrivato? Invia un nuovo codice")}</button>;
}
