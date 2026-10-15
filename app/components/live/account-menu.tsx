"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, List, LogOut, Settings2, Users } from "lucide-react";

export function AccountMenu() {
  const { t } = useI18n();
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const root = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function outside(event: PointerEvent) { if (event.target instanceof Node && !root.current?.contains(event.target) && root.current) root.current.open = false; }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && root.current?.open) { root.current.open = false; trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  if (!isLoaded || !user) return <span className="account-menu-loading" aria-label={t("Caricamento account")} />;
  const name = user.fullName || user.username || t("Il tuo account");
  const initials = name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase();
  function close() { if (root.current) root.current.open = false; }
  async function signOut() {
    if (pending) return;
    setPending(true); setError("");
    try { await clerk.signOut({ redirectUrl: "/" }); }
    catch { setError("Non siamo riusciti a uscire. Riprova."); setPending(false); }
  }
  return <details className="account-menu" ref={root} onBlur={event => { if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <summary ref={trigger} aria-label={t("Apri il menu account")}><span className="account-avatar">{user.hasImage ? <Image src={user.imageUrl} width={36} height={36} alt="" unoptimized /> : initials}</span><span className="account-trigger-name">{user.firstName || user.username || "Account"}</span><ChevronDown size={14} aria-hidden="true" /></summary>
    <div className="account-popover">
      <div className="account-identity"><strong>{name}</strong><span>{user.primaryEmailAddress?.emailAddress}</span></div>
      <nav aria-label={t("Il tuo account")}><Link href="/lists" onClick={close}><List size={17} />{t("Le mie liste")}</Link><Link href="/friends" onClick={close}><Users size={17} />{t("Liste degli amici")}</Link><button type="button" onClick={() => { close(); clerk.openUserProfile(); }}><Settings2 size={17} />{t("Gestisci account")}</button></nav>
      <button type="button" className="account-sign-out" disabled={pending} onClick={signOut}><LogOut size={17} />{pending ? t("Uscita…") : t("Esci")}</button>
      {error && <p role="alert" className="form-error">{t(error)}</p>}
    </div>
  </details>;
}
