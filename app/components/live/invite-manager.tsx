"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Check, Copy, Link2, RefreshCw, Share2, UserMinus, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Dialog } from "../ui/dialog";

type Confirmation = "rotate" | "disable" | { id: Id<"memberships">; name: string } | { guestId: Id<"guestSessions">; name: string };

export function InviteManager({ listId, archived, onClose }: { listId: Id<"lists">; archived: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const link = useQuery(api.invites.getOwnerLink, { listId });
  const members = useQuery(api.memberships.list, { listId });
  const guests = useQuery(api.guests.listSessions, { listId });
  const create = useAction(api.inviteLinks.create);
  const rotate = useAction(api.inviteLinks.rotate);
  const disable = useMutation(api.invites.disable);
  const revoke = useMutation(api.memberships.revoke);
  const restore = useMutation(api.memberships.restore);
  const revokeGuest = useMutation(api.guests.revoke);
  const restoreGuest = useMutation(api.guests.restore);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedUrl, setCopiedUrl] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const lock = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  const url = link?.token && typeof window !== "undefined" ? `${window.location.origin}/invite/${link.token}` : "";
  const copied = Boolean(url) && copiedUrl === url;
  async function run(action: () => Promise<unknown>, message = "") {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(""); setNotice("");
    try { await action(); setConfirmation(null); setNotice(message); }
    catch (cause) { setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "Non siamo riusciti a completare l’operazione. Riprova."); }
    finally { lock.current = false; setPending(false); }
  }
  async function copy() {
    if (!url) return;
    setCopiedUrl("");
    try { await navigator.clipboard.writeText(url); setCopiedUrl(url); setNotice("Link copiato. Puoi inviarlo a chi vuoi invitare."); }
    catch { field.current?.focus(); field.current?.select(); setNotice("Seleziona e copia il link qui sopra."); }
  }
  async function share() {
    if (!url) return;
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: t("Un invito su Regalando"), text: t("Scopri la mia lista di desideri su Regalando."), url }); }
    catch (cause) { if (!(cause instanceof Error && cause.name === "AbortError")) await copy(); }
  }
  async function confirm() {
    if (confirmation === "rotate") await run(() => rotate({ listId }), "Nuovo link pronto. Il precedente non permette più di entrare.");
    else if (confirmation === "disable") await run(() => disable({ listId }), "Link disattivato. Gli amici già entrati mantengono l’accesso.");
    else if (confirmation && "guestId" in confirmation) await run(() => revokeGuest({ guestSessionId: confirmation.guestId }), "Accesso ospite rimosso.");
    else if (confirmation) await run(() => revoke({ membershipId: confirmation.id }), "Accesso rimosso.");
  }
  return <Dialog title={t("Invita amici")} subtitle={t("Condividi la tua lista con le persone che ti conoscono.")} className="invite-dialog" onClose={() => { if (!pending) onClose(); }}>
    <div className="invite-manager">
      <section className="invite-section"><h3><Link2 size={17} />{t("Il link della lista")}</h3>
        <p>{t("Chi riceve questo link può entrare come ospite oppure con un account. Può anche inoltrarlo ad altre persone.")}</p>
        {archived && <p className="invite-hint">{t("La lista è archiviata: non accetta nuovi partecipanti.")}</p>}
        {link === undefined ? <p role="status">{t("Caricamento del link…")}</p> : link ? <>
          <label className="sr-only" htmlFor="invite-link">{t("Link di invito")}</label><input id="invite-link" className="invite-link-field" ref={field} value={url} readOnly onFocus={event => event.currentTarget.select()} />
          <div className="invite-share-actions"><button className="button primary" disabled={pending || archived} onClick={share}><Share2 size={16} />{t("Condividi")}</button><button className={`button secondary${copied ? " copy-confirmed" : ""}`} disabled={pending || archived} onClick={copy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? t("Link copiato") : t("Copia link")}</button></div>
          <div className="invite-link-options">{!archived && <button className="subtle-button" disabled={pending} onClick={() => { setError(""); setNotice(""); setConfirmation("rotate"); }}><RefreshCw size={14} />{t("Rigenera link")}</button>}<button className="subtle-button danger" disabled={pending} onClick={() => { setError(""); setNotice(""); setConfirmation("disable"); }}>{t("Disattiva link")}</button></div>
        </> : !archived && <button className="button primary" disabled={pending} onClick={() => run(() => create({ listId }), "Link di invito pronto.")}><Link2 size={16} />{pending ? t("Creazione…") : t("Crea link di invito")}</button>}
      </section>
      {guests && guests.length > 0 && <section className="invite-section"><h3><Users size={17} />{t("Accessi ospite")}</h3><p>{t("I nomi inseriti nelle prenotazioni restano nascosti qui. Puoi gestire il singolo accesso ospite; una persona senza account può rientrare da un altro browser.")}</p><ul className="member-list">{guests.map((guest, index) => { const guestName = t("Ospite {0}", { "0": index + 1 }); return <li key={guest.id}><span className="member-avatar" aria-hidden="true">{guestName.slice(0, 1)}</span><span className="member-name"><strong>{guestName}</strong><small>{guest.status === "active" ? t("Accesso attivo") : t("Accesso rimosso")}</small></span>{guest.status === "active" ? <button className="subtle-button danger" disabled={pending} aria-label={t("Rimuovi {0}", { "0": guestName })} onClick={() => { setError(""); setNotice(""); setConfirmation({ guestId: guest.id, name: guestName }); }}><UserMinus size={16} />{t("Rimuovi")}</button> : !archived && <button className="subtle-button" disabled={pending} aria-label={t("Riabilita {0}", { "0": guestName })} onClick={() => run(() => restoreGuest({ guestSessionId: guest.id }), "Accesso ospite riabilitato.")}>{t("Riabilita")}</button>}</li>; })}</ul></section>}
      <section className="invite-section"><h3><Users size={17} />{t("Chi partecipa")}</h3><p>{t("Puoi gestire gli accessi senza vedere quali regali sono stati scelti.")}</p>
        {members === undefined ? <p role="status">{t("Caricamento dei partecipanti…")}</p> : members.length === 0 ? <p className="invite-hint">{t("Appena qualcuno accetta l’invito, lo ritrovi qui.")}</p> : <ul className="member-list">{members.map(member => <li key={member.id}><span className="member-avatar" aria-hidden="true">{Array.from(member.name)[0]?.toUpperCase()}</span><span className="member-name"><strong>{member.name}</strong><small>{member.status === "active" ? t("Accesso attivo") : t("Accesso rimosso")}</small></span>{member.status === "active" ? <button className="subtle-button danger" disabled={pending} aria-label={t("Rimuovi {0}", { "0": member.name })} onClick={() => { setError(""); setNotice(""); setConfirmation({ id: member.id, name: member.name }); }}><UserMinus size={16} /><span>{t("Rimuovi")}</span></button> : !archived && <button className="subtle-button" disabled={pending} aria-label={t("Riabilita {0}", { "0": member.name })} onClick={() => run(() => restore({ membershipId: member.id }), "Accesso riabilitato.")}>{t("Riabilita")}</button>}</li>)}</ul>}
      </section>
      {confirmation && <div className="invite-confirmation"><h3>{confirmation === "rotate" ? t("Rigenerare il link?") : confirmation === "disable" ? t("Disattivare il link?") : t("Rimuovere {0}?", { "0": confirmation.name })}</h3><p>{typeof confirmation === "string" ? t("Il link attuale smetterà di funzionare. Gli amici già entrati mantengono l’accesso.") : "guestId" in confirmation ? t("Questo accesso ospite non potrà più aprire la lista finché non lo riabiliti.") : t("Questa persona perderà l’accesso alla lista. Potrà rientrare solo dopo che l’avrai riabilitata.")}</p><div className="invite-share-actions"><button className="button secondary" disabled={pending} onClick={() => setConfirmation(null)}>{t("Annulla")}</button><button className="button danger" disabled={pending} onClick={confirm}>{pending ? t("Un momento…") : t("Conferma")}</button></div></div>}
      {error && <p role="alert" className="form-error">{t(error)}</p>}{notice && <p role="status" className="invite-notice">{t(notice)}</p>}
    </div>
  </Dialog>;
}
