"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Gift, Globe2, Heart, LoaderCircle, MapPin, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { categories, illustrationFor, plural } from "@/lib/domain";
import { CoverArt, ProductArt } from "../ui/artwork";
import { Dialog } from "../ui/dialog";
import type { FunctionReturnType } from "convex/server";
import { ReservationControls, groupSummary, type GuestCredentials } from "./reservation-controls";
import { GiftNotes } from "./gift-notes";

export function ParticipantDetail({ listId }: { listId: Id<"lists"> }) {
  const { t } = useI18n();
  const data = useQuery(api.lists.getParticipantDetail, { listId });
  if (!data) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento della lista…")}</div>;
  return <ParticipantList data={data} />;
}

export function ParticipantList({ data, guest }: { data: FunctionReturnType<typeof api.lists.getParticipantDetail>; guest?: GuestCredentials }) {
  const { t, locale, formatDate, formatPrice } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("favorites");
  const [pending, setPending] = useState(false);
  const selected = data.gifts.find(gift => gift._id === selectedId);
  const visible = data.gifts.filter(gift => category === "all" || gift.category === category).sort((a, b) => sort === "price" ? (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity) : sort === "name" ? a.title.localeCompare(b.title, locale) : Number(b.priority === "favorite") - Number(a.priority === "favorite"));
  return <>
    {!guest && <Link className="back-link" href="/friends"><ArrowLeft size={16} />{t("Liste degli amici")}</Link>}
    <div className={`detail-hero detail-${data.cover}`}><CoverArt cover={data.cover} imageUrl={data.imageUrl} /><div className="detail-copy"><span className="eyebrow">{data.status === "archived" ? t("LISTA ARCHIVIATA") : t("I DESIDERI DI {0}", { "0": data.ownerName.toLocaleUpperCase(locale) })}</span><h1>{data.title}</h1>{data.description && <p>{data.description}</p>}<div className="detail-meta"><span><CalendarDays size={15} />{formatDate(data.date)}</span><span><Gift size={15} />{plural(data.gifts.length, t("desiderio"), t("desideri"))}</span></div></div></div>
    <div className="detail-actions participant-note"><p><ShieldCheck size={17} />{t("Le prenotazioni non compaiono nella vista del proprietario.")}</p></div>
    {data.gifts.length > 0 && <div className="gift-toolbar"><div className="category-filters" role="group" aria-label={t("Categoria dei regali")}>{[["all", t("Tutti")], ...Object.entries(categories).filter(([key]) => data.gifts.some(gift => gift.category === key))].map(([key, label]) => <button key={key} className={category === key ? "selected" : ""} aria-pressed={category === key} onClick={() => setCategory(key)}>{t(label)}</button>)}</div><label className="sort-control">{t("Ordina per")}<select value={sort} onChange={event => setSort(event.target.value)}><option value="favorites">{t("Preferiti")}</option><option value="price">{t("Prezzo crescente")}</option><option value="name">{t("Nome")}</option></select></label></div>}
    {visible.length === 0 ? <div className="empty-state"><Gift size={30} /><h2>{data.gifts.length ? t("Nessun regalo in questa categoria") : t("I desideri arriveranno qui")}</h2><p>{data.gifts.length ? t("Scegli un’altra categoria.") : t("{0} non ha ancora aggiunto regali a questa lista.", { "0": data.ownerName })}</p></div> : <div className="gift-grid">{visible.map(gift => <article className="gift-card" key={gift._id}><div className="gift-card-body"><div className="gift-card-heading"><div className="gift-card-primary"><span className="eyebrow">{t(categories[gift.category])}</span><h2><button className="gift-title-button" aria-haspopup="dialog" onClick={() => setSelectedId(gift._id)}>{gift.title}</button></h2><strong className="gift-price">{formatPrice(gift.priceCents)}</strong></div><div className="gift-image"><ProductArt kind={illustrationFor(gift.category)} imageUrl={gift.imageUrl} /></div></div>{gift.description && <p>{gift.description}</p>}<div className="gift-card-footer">{gift.priority === "favorite" && <span className="favorite-badge"><Heart size={12} />{t("Preferito")}</span>}{gift.group && <span className="group-badge"><Users size={12} />{t("Di gruppo")}</span>}<button className="subtle-button gift-details-button" aria-label={t("Dettagli di {0}", { "0": gift.title })} aria-haspopup="dialog" onClick={() => setSelectedId(gift._id)}>{t("Dettagli") + " "}<ArrowRight size={14} /></button></div>{gift.reservation && <span className="participant-reservation">{gift.reservation.mine ? t("Lo regali tu") : t("Prenotato da {0}", { "0": gift.reservation.name })}</span>}{gift.contributions && <span className="participant-reservation">{groupSummary(gift, t, formatPrice)}</span>}{gift.noteCount > 0 && <span className="participant-reservation note-count"><MessageCircle size={12} aria-hidden="true" />{plural(gift.noteCount, t("nota tra amici"), t("note tra amici"))}</span>}</div></article>)}</div>}
    {selected && <Dialog title={selected.title} eyebrow={t(categories[selected.category])} className="gift-dialog" onClose={() => { if (!pending) setSelectedId(null); }}><div className="gift-detail-content"><div className="gift-detail-summary"><div><span className="detail-price-label">{t("PREZZO INDICATIVO")}</span><strong className="detail-price">{formatPrice(selected.priceCents)}</strong></div><ProductArt kind={illustrationFor(selected.category)} imageUrl={selected.imageUrl} /></div>{selected.description && <section className="gift-detail-section gift-description" aria-label={t("Descrizione")}><h3>{t("Il desiderio")}</h3><p>{selected.description}</p></section>}{selected.locations.length > 0 && <section className="gift-detail-section gift-locations" aria-label={t("Luoghi di acquisto")}><h3>{t("Dove trovarlo")}</h3><ul>{selected.locations.map((location, index) => <li key={index}>{location.kind === "online" ? <a className="gift-purchase-link" href={location.url} target="_blank" rel="noopener noreferrer"><span className="gift-purchase-icon"><Globe2 size={18} /></span><span className="gift-purchase-copy"><strong>{t("Vai al sito")}</strong><small>{new URL(location.url).hostname.replace(/^www\./, "")}</small></span><ExternalLink size={16} /></a> : <div className="gift-store-row"><span className="gift-purchase-icon"><MapPin size={18} /></span><span className="gift-purchase-copy"><strong>{location.name}</strong>{location.address && <small>{location.address}</small>}</span></div>}</li>)}</ul></section>}<ReservationControls key={selected._id} gift={selected} guest={guest} archived={data.status === "archived"} onPendingChange={setPending} /><GiftNotes key={`notes-${selected._id}`} giftId={selected._id} ownerName={data.ownerName} guest={guest} archived={data.status === "archived"} onPendingChange={setPending} /></div></Dialog>}
  </>;
}
