"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { forgetGuestSession } from "@/lib/guest-session";
import { ParticipantList } from "./participant-detail";

export function GuestList({ token, secret }: { token: string; secret: string }) {
  const { t } = useI18n();
  const result = useQuery(api.guests.getDetail, { token, secret });
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/invite/${token}` : "";
  async function copy() {
    setCopied(false); setManual(false);
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setManual(true); }
  }
  if (result === undefined) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento della lista…")}</div>;
  if (result.access !== "active") return <div className="empty-state" role="alert"><h1>{t("Il tuo accesso ospite non è disponibile")}</h1><p>{result.access === "revoked" ? t("Il proprietario ha rimosso questo accesso. Chiedigli di riabilitarlo.") : t("La sessione non è disponibile oppure il link non corrisponde alla lista.")}</p>{result.access === "unavailable" && <button className="button secondary" onClick={() => forgetGuestSession(token)}>{t("Riapri l’invito")}</button>}<Link className="text-link" href="/">{t("Torna alla home")}</Link></div>;
  return <div className="guest-list"><aside className="guest-browser-note"><div><strong>{t("Sei qui come ospite")}</strong><p>{t("Salva il link: riconosciamo le tue prenotazioni solo in questo browser. Cambiando dispositivo o cancellando i dati del sito, non potrai annullarle.")}</p></div><button className={`button secondary${copied ? " copy-confirmed" : ""}`} onClick={copy}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? t("Link copiato") : t("Copia link della lista")}</button>{copied && <span className="sr-only" role="status">{t("Link della lista copiato")}</span>}{manual && <label className="guest-manual-link">{t("Copia e conserva questo link")}<input readOnly value={url} onFocus={event => event.currentTarget.select()} /></label>}</aside><ParticipantList data={result.detail} guest={{ token, secret }} /></div>;
}
