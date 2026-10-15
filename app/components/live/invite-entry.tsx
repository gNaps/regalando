"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useRef, useState } from "react";
import { ArrowRight, CalendarDays, LoaderCircle, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { } from "@/lib/domain";
import { CoverArt } from "../ui/artwork";
import { ProfileBootstrap } from "./profile-bootstrap";
import { AccountMenu } from "./account-menu";
import { useGuestSession, saveGuestSession } from "@/lib/guest-session";
import { GuestList } from "./guest-list";

export function InviteAccount() {
  const { t } = useI18n();
  const { isLoaded, isSignedIn } = useUser();
  const path = usePathname();
  if (!isLoaded) return null;
  return isSignedIn ? <AccountMenu /> : <Link className="text-link" href={`/sign-in?redirect_url=${encodeURIComponent(path)}`}>{t("Accedi") + " "}<ArrowRight size={14} /></Link>;
}

export function InviteEntry({ token }: { token: string }) {
  const { t } = useI18n();
  const { isLoading } = useConvexAuth();
  const { isLoaded, isSignedIn } = useUser();
  if (isLoading || !isLoaded) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento dell’invito…")}</div>;
  return isSignedIn ? <ProfileBootstrap><InviteContent token={token} /></ProfileBootstrap> : <AnonymousInvite token={token} />;
}

function AnonymousInvite({ token }: { token: string }) {
  const secret = useGuestSession(token);
  return secret ? <GuestList token={token} secret={secret} /> : <InviteContent token={token} />;
}

function InviteContent({ token }: { token: string }) {
  const { t, locale, formatDate } = useI18n();
  const preview = useQuery(api.invites.preview, { token });
  const join = useMutation(api.invites.join);
  const enterAsGuest = useAction(api.guestAccess.create);
  const router = useRouter();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const returnPath = `/invite/${token}`;
  async function accept() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try { const listId = await join({ token }); router.replace(`/lists/${listId}`); }
    catch (cause) { setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "Non siamo riusciti ad accettare l’invito. Riprova."); lock.current = false; setPending(false); }
  }
  async function guestAccess() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const { secret } = await enterAsGuest({ token });
      try { saveGuestSession(token, secret); }
      catch { throw new ConvexError("Il browser impedisce di ricordare l’accesso ospite. Consenti il salvataggio dei dati del sito e riprova."); }
    } catch (cause) { setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "Non siamo riusciti ad aprire la lista. Riprova."); }
    finally { lock.current = false; setPending(false); }
  }
  if (preview === undefined) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento dell’invito…")}</div>;
  if (!preview) return <div className="empty-state invite-unavailable"><ShieldCheck size={30} /><h1>{t("Questo invito non è disponibile")}</h1><p>{t("Il link potrebbe essere stato disattivato o sostituito. Chiedi un nuovo invito al proprietario della lista.")}</p><Link className="button secondary" href="/">{t("Torna alla home")}</Link></div>;
  const blocked = preview.access === "revoked" || preview.access === "disabled";
  const alreadyJoined = Boolean(preview.listId);
  return <section className="invite-entry"><div className="invite-entry-art"><CoverArt cover="sand" /></div><span className="eyebrow">{t("UN INVITO DA") + " "}{preview.ownerName.toLocaleUpperCase(locale)}</span><h1>{preview.title}</h1><p className="invite-owner">{preview.ownerName} {" " + t("vuole condividere con te i suoi desideri.")}</p>{preview.date && <p className="invite-date"><CalendarDays size={15} />{formatDate(preview.date)}</p>}
    <div className="invite-entry-action">{blocked ? <><h2>{t("Il tuo accesso non è disponibile")}</h2><p>{preview.access === "revoked" ? t("Il proprietario ha rimosso il tuo accesso. Chiedigli di riabilitarti per tornare alla lista.") : t("Il tuo account non è disponibile.")}</p></> : alreadyJoined ? <><p>{preview.access === "owner" ? t("Questa è la tua lista.") : t("Hai già accettato questo invito.")}</p><Link className="button primary" href={`/lists/${preview.listId}`}>{t("Apri la lista") + " "}<ArrowRight size={16} /></Link></> : preview.archived ? <><h2>{t("Questa lista è archiviata")}</h2><p>{t("Al momento non accetta nuovi partecipanti.")}</p></> : preview.access === "guest" ? <>
      <p>{t("Con un account ritrovi la lista e le tue prenotazioni anche su altri dispositivi.")}</p>
      <div className="invite-account-actions"><Link className="button primary" href={`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`}>{t("Accedi") + " "}<ArrowRight size={16} /></Link><Link className="button secondary" href={`/sign-up?redirect_url=${encodeURIComponent(returnPath)}`}>{t("Registrati")}</Link></div>
      <div className="invite-guest-option"><span>{t("oppure")}</span><button className="subtle-button" disabled={pending} onClick={guestAccess}>{pending ? t("Ingresso in corso…") : t("Accedi come ospite")}</button><p className="invite-guest-help">{t("Senza account, con il nome richiesto solo per prenotare. Conserva il link per ritrovare la lista.")}</p></div>
    </> : <><p>{t("Accetta l’invito per vedere i desideri e ritrovare questa lista tra quelle dei tuoi amici.")}</p><button className="button primary" disabled={pending} onClick={accept}>{pending ? t("Ingresso in corso…") : t("Accetta invito")}<ArrowRight size={16} /></button></>}
      {error && <p className="form-error" role="alert">{t(error)}</p>}
    </div><p className="invite-reassurance"><ShieldCheck size={15} />{t("Le prenotazioni non compaiono nella vista del proprietario.")}</p>
  </section>;
}
