"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import { useRef, useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Check, Gift, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { plural } from "@/lib/domain";

type GiftDetail = FunctionReturnType<typeof api.lists.getParticipantDetail>["gifts"][number];
export type GuestCredentials = { token: string; secret: string };

function parseAmount(raw: string): { amountCents?: number; error?: string } {
  if (raw.trim() === "") return {};
  const amountCents = Math.round(Number(raw) * 100);
  return Number.isSafeInteger(amountCents) && amountCents >= 0 ? { amountCents } : { error: "Inserisci un importo valido." };
}

export function ReservationControls({ gift, archived, guest, onPendingChange }: { gift: GiftDetail; archived: boolean; guest?: GuestCredentials; onPendingChange: (value: boolean) => void }) {
  const { t, formatPrice } = useI18n();
  const reserve = useMutation(api.reservations.reserveGift);
  const cancel = useMutation(api.reservations.cancelGift);
  const reserveGuest = useMutation(api.reservations.reserveAsGuest);
  const cancelGuest = useMutation(api.reservations.cancelAsGuest);
  const [mode, setMode] = useState<"normal" | "reserve" | "propose" | "cancel">("normal");
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
  function leave() { return run(() => guest ? cancelGuest({ ...guest, giftId: gift._id }) : cancel({ giftId: gift._id })); }
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "");
    const group = Boolean(gift.contributions) || mode === "propose";
    const parsed = group ? parseAmount(String(form.get("amount") ?? "")) : {};
    if (parsed.error) { setError(parsed.error); return; }
    const amountCents = parsed.amountCents;
    await run(() => guest ? reserveGuest({ ...guest, giftId: gift._id, expectedVersion: gift.version, name, amountCents, group }) : reserve({ giftId: gift._id, expectedVersion: gift.version, amountCents, group }));
  }
  function setGroup(group: boolean) { return run(() => guest ? reserveGuest({ ...guest, giftId: gift._id, expectedVersion: gift.version, name: "", group }) : reserve({ giftId: gift._id, expectedVersion: gift.version, group })); }
  const amountField = (mineAmount?: number) => <label>{t("Quota indicativa (€)") + " "}<span className="optional">{t("facoltativa")}</span><input name="amount" type="number" min="0" max="1000000" step="0.01" inputMode="decimal" defaultValue={mineAmount === undefined ? "" : mineAmount / 100} placeholder={t("Es. 20")} /></label>;
  const nameField = guest && <label>{t("Il tuo nome")}<input name="name" required maxLength={80} autoComplete="name" placeholder={t("Come ti chiami?")} /></label>;

  if (gift.contributions) {
    const { participants, totalCents, mine } = gift.contributions;
    const remaining = gift.priceCents === undefined ? undefined : Math.max(0, gift.priceCents - totalCents);
    return <section className="reservation-controls group-controls" aria-label={t("Regalo di gruppo")}>
      <h3 className={mine ? "reservation-mine" : undefined}>{mine ? <Check size={17} /> : <Users size={17} />}{mine ? mine.amountCents === undefined ? t("Partecipi anche tu") : t("Partecipi con {0}", { "0": formatPrice(mine.amountCents) }) : t("Regalo di gruppo")}</h3>
      <p className="group-progress">{gift.priceCents === undefined ? totalCents > 0 ? t("{0} impegnati finora.", { "0": formatPrice(totalCents) }) : t("Gli amici possono aderire in più persone e dividersi la spesa.") : remaining === 0 ? t("{0} raccolti: la cifra è coperta.", { "0": formatPrice(totalCents) }) : t("{0} su {1} impegnati, mancano {2}.", { "0": formatPrice(totalCents), "1": formatPrice(gift.priceCents), "2": formatPrice(remaining ?? 0) })}</p>
      {participants.length > 0 ? <ul className="group-participants" aria-label={t("Chi partecipa")}>{participants.map((entry, index) => <li key={index}><span>{entry.mine ? t("Tu") : entry.name}</span><span>{entry.amountCents === undefined ? t("quota da definire") : formatPrice(entry.amountCents)}</span></li>)}</ul> : <p>{t("Nessuno ha ancora aderito: puoi essere la prima persona.")}</p>}
      {mode === "cancel" ? <><h3>{t("Uscire dal regalo di gruppo?")}</h3><p>{t("La tua quota verrà tolta dal conteggio visibile agli altri amici.")}</p><div className="reservation-actions"><button className="button secondary" disabled={busy} onClick={() => setMode("normal")}>{t("Indietro")}</button><button className="button danger" disabled={busy} onClick={leave}>{busy ? t("Un momento…") : t("Conferma uscita")}</button></div></>
        : mode === "reserve" ? <form className="form reservation-form" onSubmit={confirm}><fieldset disabled={busy}><h3>{mine ? t("Aggiorna la tua quota") : t("Partecipa al regalo")}</h3>{nameField}{amountField(mine?.amountCents)}<p>{t("La quota serve solo agli altri amici per organizzarsi: qui non avviene nessun pagamento. ")}{t("Le prenotazioni non compaiono nella vista del proprietario.")}</p><div className="reservation-actions"><button className="button secondary" type="button" onClick={() => { setMode("normal"); setError(""); }}>{t("Indietro")}</button><button className="button primary" type="submit" disabled={busy}>{busy ? t("Un momento…") : mine ? t("Salva quota") : t("Conferma partecipazione")}</button></div></fieldset></form>
        : mine ? <div className="reservation-actions"><button className="button secondary" disabled={busy} onClick={() => { setError(""); setMode("reserve"); }}>{t("Modifica quota")}</button>{participants.length === 1 && <button className="button secondary" disabled={busy} onClick={() => setGroup(false)}>{t("Lo regalo da solo")}</button>}<button className="button secondary" disabled={busy} onClick={() => { setError(""); setMode("cancel"); }}>{t("Esci dal gruppo")}</button></div>
        : archived ? <p>{t("Questa lista è archiviata: non puoi aderire a nuovi regali.")}</p>
        : <button className="button primary" onClick={() => { setError(""); setMode("reserve"); }}><Users size={16} />{t("Partecipo")}</button>}
      {error && <p className="form-error" role="alert">{t(error)}</p>}
    </section>;
  }

  return <section className="reservation-controls" aria-label={t("Prenotazione regalo")}>
    {gift.reservation?.mine ? mode === "cancel" ? <><h3>{t("Annullare la prenotazione?")}</h3><p>{t("Il regalo tornerà disponibile per gli altri partecipanti.")}</p><div className="reservation-actions"><button className="button secondary" disabled={busy} onClick={() => setMode("normal")}>{t("Indietro")}</button><button className="button danger" disabled={busy} onClick={leave}>{busy ? t("Un momento…") : t("Conferma annullamento")}</button></div></> : <><h3 className="reservation-mine"><Check size={17} />{t("Lo regali tu")}</h3><p>{t("La prenotazione conferma la tua scelta. L’acquisto avviene sul sito o nel negozio indicato.")}</p><div className="reservation-actions"><button className="button secondary" disabled={busy} onClick={() => setGroup(true)}><Users size={16} />{t("Apri al gruppo")}</button><button className="button secondary" disabled={busy} onClick={() => { setError(""); setMode("cancel"); }}>{t("Annulla prenotazione")}</button></div><p className="reservation-hint">{t("Aprire al gruppo permette ad altri amici di partecipare alla spesa con te.")}</p></> : gift.reservation ? <><h3>{t("Già prenotato")}</h3><p>{t("Prenotato da") + " "}{gift.reservation.name}.</p></> : archived ? <p>{t("Questa lista è archiviata: non puoi prenotare nuovi regali.")}</p> : mode === "propose" ? <form className="form reservation-form" onSubmit={confirm}><fieldset disabled={busy}><h3>{t("Proponi un regalo di gruppo")}</h3>{nameField}{amountField()}<p>{t("Gli altri amici vedranno la proposta e potranno aggiungere la loro quota. Qui non avviene nessun pagamento. ")}{t("Le prenotazioni non compaiono nella vista del proprietario.")}</p><div className="reservation-actions"><button className="button secondary" type="button" onClick={() => { setMode("normal"); setError(""); }}>{t("Indietro")}</button><button className="button primary" type="submit" disabled={busy}>{busy ? t("Un momento…") : t("Conferma proposta")}</button></div></fieldset></form> : mode === "reserve" ? <form className="form reservation-form" onSubmit={confirm}><fieldset disabled={busy}><h3>{t("Questo regalo lo scegli tu")}</h3>{nameField}<p>{guest ? t("Il nome sarà visibile agli altri partecipanti insieme alla tua scelta. ") : t("La tua scelta sarà visibile agli altri partecipanti. ")}{t("Le prenotazioni non compaiono nella vista del proprietario.")}</p><div className="reservation-actions"><button className="button secondary" type="button" onClick={() => { setMode("normal"); setError(""); }}>{t("Indietro")}</button><button className="button primary" type="submit" disabled={busy}>{busy ? t("Prenotazione…") : t("Conferma prenotazione")}</button></div></fieldset></form> : <><p>{t("Prenota questo desiderio per evitare che gli altri amici scelgano lo stesso regalo, oppure proponi di dividere la spesa.")}</p><div className="reservation-actions"><button className="button primary" onClick={() => { setError(""); setMode("reserve"); }}><Gift size={16} />{t("Prenota regalo")}</button><button className="button secondary" onClick={() => { setError(""); setMode("propose"); }}><Users size={16} />{t("Proponi regalo di gruppo")}</button></div></>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </section>;
}

export function groupSummary(gift: GiftDetail, t: (message: string, values?: Record<string, string | number>) => string, formatPrice: (cents?: number) => string) {
  if (!gift.contributions) return null;
  const { participants, totalCents, mine } = gift.contributions;
  if (participants.length === 0) return t("Regalo di gruppo: nessuno ha ancora aderito");
  const who = mine ? participants.length === 1 ? t("Partecipi tu") : t("Partecipi tu e {0}", { "0": plural(participants.length - 1, t("altro amico"), t("altri amici")) }) : plural(participants.length, t("amico partecipa"), t("amici partecipano"));
  return gift.priceCents === undefined ? who : `${who} · ${t("{0} su {1}", { "0": formatPrice(totalCents), "1": formatPrice(gift.priceCents) })}`;
}
