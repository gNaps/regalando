"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { LoaderCircle, Lock, MessageCircle, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intlLocales } from "@/lib/i18n";
import type { GuestCredentials } from "./reservation-controls";

// Notes are shared among friends only. The owner has no query for them, so this
// component is rendered exclusively inside participant and guest views.
export function GiftNotes({ giftId, ownerName, archived, guest, onPendingChange }: { giftId: Id<"gifts">; ownerName: string; archived: boolean; guest?: GuestCredentials; onPendingChange: (value: boolean) => void }) {
  const { t, locale } = useI18n();
  const accountNotes = useQuery(api.notes.listForGift, guest ? "skip" : { giftId });
  const guestNotes = useQuery(api.notes.listAsGuest, guest ? { ...guest, giftId } : "skip");
  const notes = guest ? guestNotes : accountNotes;
  const add = useMutation(api.notes.add);
  const addAsGuest = useMutation(api.notes.addAsGuest);
  const remove = useMutation(api.notes.remove);
  const removeAsGuest = useMutation(api.notes.removeAsGuest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const lock = useRef(false);
  const formatter = new Intl.DateTimeFormat(intlLocales[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  async function run(action: () => Promise<unknown>) {
    if (lock.current) return false;
    lock.current = true; setBusy(true); onPendingChange(true); setError("");
    try { await action(); return true; }
    catch (cause) { setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "Non siamo riusciti a salvare la nota. Riprova."); return false; }
    finally { lock.current = false; setBusy(false); onPendingChange(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = draft.trim();
    const name = String(form.get("name") || "");
    if (!body) { setError("Scrivi il testo della nota."); return; }
    const saved = await run(() => guest ? addAsGuest({ ...guest, giftId, name, body }) : add({ giftId, body }));
    if (saved) setDraft("");
  }
  return <section className="gift-notes" aria-label={t("Note tra amici")}>
    <h3><MessageCircle size={17} />{t("Note tra amici")}</h3>
    <p className="gift-notes-privacy"><Lock size={13} aria-hidden="true" />{t("Visibili solo a chi partecipa, mai a {0}.", { "0": ownerName })}</p>
    {notes === undefined ? <p className="gift-notes-loading" role="status"><LoaderCircle size={16} />{t("Caricamento delle note…")}</p>
      : notes.length === 0 ? <p className="gift-notes-empty">{t("Ancora nessuna nota. Usa questo spazio per metterti d’accordo con gli altri: colore, taglia, chi compra, chi incarta.")}</p>
      : <ul className="note-list">{notes.map(note => <li key={note.id} className={note.mine ? "note-item mine" : "note-item"}><div className="note-meta"><strong>{note.mine ? t("Tu") : note.name}</strong><time dateTime={new Date(note.createdAt).toISOString()}>{formatter.format(note.createdAt)}</time>{note.mine && !archived && <button type="button" className="subtle-button" disabled={busy} aria-label={t("Elimina la nota")} onClick={() => run(() => guest ? removeAsGuest({ ...guest, noteId: note.id }) : remove({ noteId: note.id }))}><Trash2 size={14} aria-hidden="true" />{t("Elimina")}</button>}</div><p>{note.body}</p></li>)}</ul>}
    {archived ? <p className="gift-notes-empty">{t("La lista è archiviata: le note restano leggibili ma non se ne aggiungono di nuove.")}</p>
      : <form className="form note-form" onSubmit={submit}><fieldset disabled={busy}>{guest && <label>{t("Firma la nota")}<input name="name" required maxLength={80} autoComplete="name" placeholder={t("Il tuo nome")} /></label>}<label>{t("Nuova nota")}<textarea name="body" rows={2} maxLength={500} required value={draft} onChange={event => setDraft(event.target.value)} placeholder={t("Es. Lo prendo io in blu, chi si occupa del biglietto?")} /></label><div className="reservation-actions"><button className="button secondary" type="submit" disabled={busy || !draft.trim()}>{busy ? t("Un momento…") : t("Invia nota")}</button></div></fieldset></form>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </section>;
}
