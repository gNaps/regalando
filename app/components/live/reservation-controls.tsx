"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Check, Gift } from "lucide-react";
import { api } from "@/convex/_generated/api";

type GiftDetail = FunctionReturnType<typeof api.lists.getParticipantDetail>["gifts"][number];
export type GuestCredentials = { token: string; secret: string };

export function ReservationControls({ gift, archived, guest, onPendingChange }: { gift: GiftDetail; archived: boolean; guest?: GuestCredentials; onPendingChange: (value: boolean) => void }) {
  const { t } = useI18n();
  const reserve = useMutation(api.reservations.reserveGift);
  const cancel = useMutation(api.reservations.cancelGift);
  const reserveGuest = useMutation(api.reservations.reserveAsGuest);
  const cancelGuest = useMutation(api.reservations.cancelAsGuest);
  const [mode, setMode] = useState<"normal" | "reserve" | "cancel">("normal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  async function run(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); onPendingChange(true); setError("");
    try { await action(); setMode("normal"); }
    catch (cause) { setError(cause instanceof ConvexError && typeof cause.data === "string" ? cause.data : "Non siamo riusciti ad aggiornare la prenotazione. Riprova."); }
    finally { lock.current = false; setBusy(false); onPendingChange(false); }
  }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "");
    await run(() => guest ? reserveGuest({ ...guest, giftId: gift._id, expectedVersion: gift.version, name }) : reserve({ giftId: gift._id, expectedVersion: gift.version }));
  }
  return <section className="reservation-controls" aria-label={t("Prenotazione regalo")}>
    {gift.reservation?.mine ? mode === "cancel" ? <><h3>{t("Annullare la prenotazione?")}</h3><p>{t("Il regalo tornerà disponibile per gli altri partecipanti.")}</p><div className="reservation-actions"><button className="button secondary" disabled={busy} onClick={() => setMode("normal")}>{t("Indietro")}</button><button className="button danger" disabled={busy} onClick={() => run(() => guest ? cancelGuest({ ...guest, giftId: gift._id }) : cancel({ giftId: gift._id }))}>{busy ? t("Un momento…") : t("Conferma annullamento")}</button></div></> : <><h3 className="reservation-mine"><Check size={17} />{t("Lo regali tu")}</h3><p>{t("La prenotazione conferma la tua scelta. L’acquisto avviene sul sito o nel negozio indicato.")}</p><button className="button secondary" disabled={busy} onClick={() => { setError(""); setMode("cancel"); }}>{t("Annulla prenotazione")}</button></> : gift.reservation ? <><h3>{t("Già prenotato")}</h3><p>{t("Prenotato da") + " "}{gift.reservation.name}.</p></> : archived ? <p>{t("Questa lista è archiviata: non puoi prenotare nuovi regali.")}</p> : mode === "reserve" ? <form className="form reservation-form" onSubmit={confirm}><fieldset disabled={busy}><h3>{t("Questo regalo lo scegli tu")}</h3>{guest && <label>{t("Il tuo nome")}<input name="name" required maxLength={80} autoComplete="name" placeholder={t("Come ti chiami?")} /></label>}<p>{guest ? t("Il nome sarà visibile agli altri partecipanti insieme alla tua scelta. ") : t("La tua scelta sarà visibile agli altri partecipanti. ")}{t("Le prenotazioni non compaiono nella vista del proprietario.")}</p><div className="reservation-actions"><button className="button secondary" type="button" onClick={() => { setMode("normal"); setError(""); }}>{t("Indietro")}</button><button className="button primary" type="submit" disabled={busy}>{busy ? t("Prenotazione…") : t("Conferma prenotazione")}</button></div></fieldset></form> : <><p>{t("Prenota questo desiderio per evitare che gli altri amici scelgano lo stesso regalo.")}</p><button className="button primary" onClick={() => { setError(""); setMode("reserve"); }}><Gift size={16} />{t("Prenota regalo")}</button></>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </section>;
}
