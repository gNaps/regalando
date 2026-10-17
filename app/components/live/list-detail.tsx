"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Archive, ArchiveRestore, ArrowLeft, ArrowRight, CalendarDays, ExternalLink, Gift as GiftIcon, Globe2, Heart, ImagePlus, LoaderCircle, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { categories, giftLocations, illustrationFor, plural, type Gift } from "@/lib/domain";
import { CoverArt, ProductArt } from "../ui/artwork";
import { Dialog } from "../ui/dialog";
import { SurpriseSeal } from "../ui/surprise-seal";
import { PhotoChange } from "../ui/photo-field";
import { GiftForm, ListForm, type ListFormValues } from "../ui/forms";
import { ImageEditor } from "./image-editor";
import { InviteManager } from "./invite-manager";
import { ParticipantDetail } from "./participant-detail";

function giftFormValues(gift: Doc<"gifts">): Gift {
  const online = gift.locations.find(location => location.kind === "online");
  const physical = gift.locations.find(location => location.kind === "physical");
  return { id: gift._id, title: gift.title, description: gift.description, priceCents: gift.priceCents, category: gift.category, favorite: gift.priority === "favorite", url: online?.url, shop: physical?.name, shopAddress: physical?.address };
}

function mutationError(error: unknown, fallback: string) {
  return error instanceof ConvexError && typeof error.data === "string" ? error.data : fallback;
}

function websiteName(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "Link online"; }
}

export function LiveListDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const listId = id as Id<"lists">;
  const access = useQuery(api.lists.getAccess, { listId });
  if (access === undefined) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento della lista…")}</div>;
  if (access === "unavailable") return <div className="empty-state" role="alert"><h1>{t("Questa lista non è disponibile")}</h1><p>{t("Il tuo accesso potrebbe essere stato rimosso. Chiedi al proprietario di verificare il tuo invito.")}</p><Link className="button secondary" href="/friends">{t("Liste degli amici")}</Link></div>;
  return access === "owner" ? <OwnerListDetail id={id} /> : <ParticipantDetail listId={listId} />;
}

function OwnerListDetail({ id }: { id: string }) {
  const { t, locale, formatDate, formatPrice } = useI18n();
  const listId = id as Id<"lists">;
  const data = useQuery(api.lists.getOwnerDetail, { listId });
  const saveList = useAction(api.listEditor.save);
  const [editingList, setEditingList] = useState(false);
  const [listError, setListError] = useState("");
  const saveGift = useAction(api.giftEditor.save);
  const removeGift = useMutation(api.gifts.remove);
  const previewLink = useAction(api.productLinks.preview);
  const setArchived = useMutation(api.lists.setArchived);
  const [imageTarget, setImageTarget] = useState<Id<"gifts"> | null>(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const archiveLock = useRef(false);
  const [create, setCreate] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"gifts"> | null>(null);
  const [editing, setEditing] = useState<Doc<"gifts"> | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Doc<"gifts"> | null>(null);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("favorites");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  async function saveHeader(values: ListFormValues, photo: PhotoChange) {
    if (pending) return;
    setPending(true); setListError("");
    try {
      await saveList({ listId, ...values, photo: photo instanceof Blob ? await photo.arrayBuffer() : photo });
      setEditingList(false);
    } catch (error) { setListError(mutationError(error, "Non siamo riusciti a salvare la lista. I dati del modulo sono ancora disponibili: riprova.")); }
    finally { setPending(false); }
  }
  async function changeArchived(archived: boolean) {
    if (pending || archiveLock.current) return;
    archiveLock.current = true;
    setPending(true); setArchiveError("");
    try {
      await setArchived({ listId, archived });
      setArchiveConfirmation(false);
    } catch (error) { setArchiveError(mutationError(error, archived ? "Non siamo riusciti ad archiviare la lista. Riprova." : "Non siamo riusciti a riattivare la lista. Riprova.")); }
    finally { archiveLock.current = false; setPending(false); }
  }
  async function save(gift: Omit<Gift, "id">, photo: PhotoChange) {
    if (pending) return;
    setPending(true); setError("");
    try {
      const values = { title: gift.title, description: gift.description, priceCents: gift.priceCents, currency: "EUR" as const, category: gift.category, priority: gift.favorite ? "favorite" as const : "normal" as const, locations: giftLocations(gift, editing?.locations), photo: photo instanceof Blob ? await photo.arrayBuffer() : photo };
      if (editing) {
        await saveGift({ listId, giftId: editing._id, expectedVersion: editing.version, ...values });
        setSelectedId(editing._id);
        setEditing(null);
      } else {
        await saveGift({ listId, ...values });
        setCreate(false);
      }
    } catch (error) { setError(mutationError(error, "Non siamo riusciti a salvare il regalo. I dettagli sono ancora nel modulo: riprova.")); }
    finally { setPending(false); }
  }
  if (!data) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento della lista…")}</div>;
  const { list, gifts } = data;
  const selected = gifts.find(gift => gift._id === selectedId);
  const visible = gifts.filter(gift => category === "all" || gift.category === category).sort((a, b) => sort === "price" ? (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity) : sort === "name" ? a.title.localeCompare(b.title, locale) : Number(b.priority === "favorite") - Number(a.priority === "favorite"));
  function openCreate() { setError(""); setCreate(true); }
  function openGift(giftId: Id<"gifts">) { setDetailError(""); setRemoveTarget(null); setSelectedId(giftId); }
  function closeForm() {
    if (pending) return;
    if (editing) setSelectedId(editing._id);
    setEditing(null); setCreate(false); setError("");
  }
  async function remove() {
    if (pending || !removeTarget) return;
    setPending(true); setDetailError("");
    try {
      await removeGift({ giftId: removeTarget._id, expectedVersion: removeTarget.version });
      if (category === removeTarget.category && gifts.every(gift => gift._id === removeTarget._id || gift.category !== category)) setCategory("all");
      setSelectedId(null); setRemoveTarget(null);
      requestAnimationFrame(() => addButton.current?.focus({ preventScroll: true }));
    } catch (error) { setDetailError(mutationError(error, "Non siamo riusciti a eliminare il regalo. Riprova.")); }
    finally { setPending(false); }
  }
  return <div className="owner-list-detail">
    <div className="detail-navigation">
      <Link href="/lists" className="back-link"><ArrowLeft size={16} aria-hidden="true" />{t("Le mie liste")}</Link>
      <div className="detail-management-actions">{list.status === "active" && <button className="detail-archive-button" disabled={pending} onClick={() => { setListError(""); setEditingList(true); }}><Pencil size={16} aria-hidden="true" />{t("Modifica lista")}</button>}
      <button className="detail-archive-button" disabled={pending} onClick={() => { setArchiveError(""); if (list.status === "active") setArchiveConfirmation(true); else void changeArchived(false); }}>
        {list.status === "active" ? <><Archive size={16} aria-hidden="true" />{t("Archivia lista")}</> : <><ArchiveRestore size={16} aria-hidden="true" />{pending ? t("Riattivazione…") : t("Riattiva lista")}</>}
      </button></div>
    </div>
    <section className={`owner-list-cover detail-${list.cover}`} aria-labelledby="list-title">
      <div className="detail-hero">
        <CoverArt cover={list.cover} imageUrl={list.imageUrl} />
        <div className="detail-copy">
          <span className="eyebrow">{list.status === "archived" ? t("LISTA ARCHIVIATA") : t("LA TUA LISTA")}</span>
          <h1 id="list-title">{list.title}</h1>
          {list.description && <p>{list.description}</p>}
          <div className="detail-meta"><span><CalendarDays size={15} aria-hidden="true" />{formatDate(list.date)}</span><span><GiftIcon size={15} aria-hidden="true" />{plural(gifts.length, t("desiderio"), t("desideri"))}</span></div>
        </div>
      </div>
      <div className="detail-actions">
        <SurpriseSeal compact />
        <div>
          <button className="button secondary" disabled={pending} onClick={() => setInviting(true)}><Users size={17} aria-hidden="true" />{list.status === "active" ? t("Invita amici") : t("Partecipanti")}</button>
          {list.status === "active" && <button ref={addButton} className="button primary" disabled={pending} onClick={openCreate}><Plus size={17} aria-hidden="true" />{t("Aggiungi regalo")}</button>}
        </div>
      </div>
    </section>
    {list.status === "archived" && <p className="detail-archive-note"><Archive size={16} aria-hidden="true" />{t("Un’occasione da ricordare. Riattiva la lista per aggiungere nuovi desideri.")}</p>}
    {archiveError && !archiveConfirmation && <p className="form-error" role="alert">{t(archiveError)}</p>}
    {archiveConfirmation && <Dialog title={t("Archiviare questa lista?")} subtitle={t("«{0}» sarà disponibile nella sezione Archiviate.", { "0": list.title })} onClose={() => { if (!pending) { setArchiveConfirmation(false); setArchiveError(""); } }}><div className="archive-dialog-content"><p>{t("I regali e le prenotazioni restano conservati. I partecipanti potranno consultare la lista e annullare le proprie prenotazioni, ma non prenotare altri regali. Potrai riattivarla quando vuoi.")}</p><div className="gift-owner-actions"><button type="button" className="button secondary" disabled={pending} onClick={() => { setArchiveConfirmation(false); setArchiveError(""); }}>{t("Annulla")}</button><button type="button" className="button primary" disabled={pending} onClick={() => changeArchived(true)}><Archive size={16} />{pending ? t("Archiviazione…") : t("Conferma archiviazione")}</button></div>{archiveError && <p className="form-error" role="alert">{t(archiveError)}</p>}</div></Dialog>}
    <div className="detail-collection-heading"><h2>{t("I tuoi desideri")}<span>{gifts.length}</span></h2><p>{t("Le idee sono tue. La sorpresa è loro.")}</p></div>
    {gifts.length > 0 && <div className="gift-toolbar"><div className="category-filters" role="group" aria-label={t("Categoria dei regali")}>{[["all", t("Tutti")], ...Object.entries(categories).filter(([key]) => gifts.some(gift => gift.category === key))].map(([key, label]) => <button key={key} className={category === key ? "selected" : ""} aria-pressed={category === key} onClick={() => setCategory(key)}>{t(label)}</button>)}</div><label className="sort-control">{t("Ordina per")}<select value={sort} onChange={event => setSort(event.target.value)}><option value="favorites">{t("Preferiti")}</option><option value="price">{t("Prezzo crescente")}</option><option value="name">{t("Nome")}</option></select></label></div>}
    {visible.length === 0 ? <div className="empty-state"><GiftIcon size={32} strokeWidth={1.4} /><h2>{gifts.length ? t("Nessun regalo in questa categoria") : t("Il primo desiderio parte da qui")}</h2><p>{gifts.length ? t("Scegli un’altra categoria per vedere i tuoi regali.") : t("Aggiungi un regalo con descrizione, prezzo e luogo di acquisto.")}</p>{!gifts.length && list.status === "active" && <button className="button primary" onClick={openCreate}><Plus size={17} />{t("Aggiungi il primo regalo")}</button>}</div> : <div className="gift-grid">
      {visible.map(gift => <article className="gift-card" key={gift._id}>
        <div className="gift-card-body">
          <div className="gift-card-heading">
            <div className="gift-card-primary">
              <span className="eyebrow">{t(categories[gift.category])}</span>
              <h2><button type="button" className="gift-title-button" aria-haspopup="dialog" onClick={() => openGift(gift._id)}>{gift.title}</button></h2>
              <strong className="gift-price">{formatPrice(gift.priceCents)}</strong>
            </div>
            <div className="gift-image"><ProductArt kind={illustrationFor(gift.category)} imageUrl={gift.imageUrl} /></div>
          </div>
          {gift.description && <p>{gift.description}</p>}
          <div className="gift-card-footer">
            {gift.priority === "favorite" && <span className="favorite-badge"><Heart size={12} />{t("Preferito")}</span>}
            <button type="button" className="subtle-button gift-details-button" aria-label={t("Dettagli di {0}", { "0": gift.title })} aria-haspopup="dialog" onClick={() => openGift(gift._id)}>{t("Dettagli") + " "}<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        </div>
      </article>)}
    </div>}
    {(create || editing) && <GiftForm key={editing?._id ?? "create"} initial={editing ? giftFormValues(editing) : undefined} imageUrl={editing ? gifts.find(gift => gift._id === editing._id)?.imageUrl : undefined} pending={pending} error={t(error)} onClose={closeForm} onSave={save} onPreview={url => previewLink({ url })} />}
    {inviting && <InviteManager listId={listId} archived={list.status === "archived"} onClose={() => setInviting(false)} />}
    {editingList && <ListForm initial={list} imageUrl={list.imageUrl} pending={pending} error={t(listError)} onClose={() => { if (!pending) setEditingList(false); }} onSave={saveHeader} />}
    {imageTarget && <ImageEditor listId={listId} giftId={imageTarget} imageUrl={gifts.find(gift => gift._id === imageTarget)?.imageUrl} onClose={() => setImageTarget(null)} />}
    {selected && !imageTarget && <Dialog title={selected.title} eyebrow={t(categories[selected.category])} className="gift-dialog" onClose={() => { if (!pending) { setSelectedId(null); setRemoveTarget(null); } }}>
      <div className="gift-detail-content">
        <div className="gift-detail-summary">
          <div><span className="detail-price-label">{selected.priceCents === undefined ? t("PREZZO") : t("PREZZO INDICATIVO")}</span><strong className="detail-price">{formatPrice(selected.priceCents)}</strong>{selected.priority === "favorite" && <span className="gift-detail-priority"><Heart size={13} aria-hidden="true" />{t("Tra i tuoi preferiti")}</span>}</div>
          <ProductArt kind={illustrationFor(selected.category)} imageUrl={selected.imageUrl} />
        </div>
        {selected.description && <section className="gift-detail-section gift-description" aria-label={t("Descrizione")}><h3>{t("Il desiderio")}</h3><p>{selected.description}</p></section>}
        {selected.locations.length > 0 && <section className="gift-detail-section gift-locations" aria-label={t("Luoghi di acquisto")}><h3>{t("Dove trovarlo")}</h3><ul>
          {selected.locations.map((location, index) => <li key={index}>{location.kind === "online" ? <a className="gift-purchase-link" href={location.url} target="_blank" rel="noopener noreferrer">
            <span className="gift-purchase-icon"><Globe2 size={18} aria-hidden="true" /></span><span className="gift-purchase-copy"><strong>{t("Vai al sito")}</strong><small>{t(websiteName(location.url))}</small></span><ExternalLink size={16} aria-hidden="true" />
          </a> : <div className="gift-store-row"><span className="gift-purchase-icon"><MapPin size={18} aria-hidden="true" /></span><span className="gift-purchase-copy"><strong>{location.name}</strong>{location.address && <small>{location.address}</small>}</span></div>}</li>)}
        </ul></section>}
        {list.status === "active" && (removeTarget ? <div className="gift-delete-confirmation">
          <h3>{t("Eliminare questo regalo?")}</h3>
          <p>«{removeTarget.title}{t("» verrà rimosso dalla lista.")}</p>
          <div className="gift-owner-actions"><button type="button" className="button secondary" disabled={pending} onClick={() => { setRemoveTarget(null); setDetailError(""); }}>{t("Annulla")}</button><button type="button" className="button danger" disabled={pending} onClick={remove}>{pending ? t("Eliminazione…") : t("Elimina regalo")}<Trash2 size={16} /></button></div>
        </div> : <div className="gift-owner-actions">
          <button type="button" className="button secondary" onClick={() => { setError(""); setEditing(selected); setSelectedId(null); }}><Pencil size={16} />{t("Modifica regalo")}</button>
          <button type="button" className="button secondary" onClick={() => setImageTarget(selected._id)}><ImagePlus size={16} aria-hidden="true" />{selected.imageUrl ? t("Modifica foto") : t("Aggiungi foto")}</button>
          <button type="button" className="subtle-button danger" onClick={() => { setDetailError(""); setRemoveTarget(selected); }}><Trash2 size={16} />{t("Elimina")}</button>
        </div>)}
        {detailError && <p className="form-error" role="alert">{t(detailError)}</p>}
      </div>
    </Dialog>}
  </div>;
}
