"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Heart, LoaderCircle, Sparkles } from "lucide-react";
import type { LinkPreview } from "@/convex/lib/linkMetadata";
import { categories, giftCategories, safeUrl, type WishList, type Gift, type Cover, type Category } from "@/lib/domain";
import { Dialog } from "../ui/dialog";
import { PhotoField, type PhotoChange } from "./photo-field";
import { CoverArt } from "../ui/artwork";

export type ListFormValues = Pick<WishList, "title" | "description" | "date" | "cover">;

export function ListForm({ initial, imageUrl, onClose, onSave, onImport, creationBlocked, pending = false, error }: { initial?: ListFormValues; imageUrl?: string | null; onClose: () => void; onSave: (values: ListFormValues, photo: PhotoChange) => void; onImport?: () => void; creationBlocked?: string; pending?: boolean; error?: string }) {
  const { t } = useI18n();
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [preparing, setPreparing] = useState(false);
  const [cover, setCover] = useState<Cover>(initial?.cover ?? "plum");
  const [dirty, setDirty] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || preparing || (!initial && creationBlocked)) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    if (!title) { const input = event.currentTarget.querySelector<HTMLInputElement>("[name=title]"); input?.setCustomValidity(t("Scrivi un titolo per la lista.")); input?.reportValidity(); return; }
    onSave({ title, description: String(data.get("description")).trim(), date: String(data.get("date")) || undefined, cover }, photo);
  }
  return <Dialog title={initial ? t("Modifica lista") : t("Nuova lista")} subtitle={t("Scegli un nome e aggiungi i dettagli dell’occasione.")} onClose={() => { if (!pending && !preparing) onClose(); }} dirty={dirty}>
    <form className="form" onSubmit={submit} onChange={() => setDirty(true)}>
      <fieldset className="list-form-fields" disabled={pending}>
      <label>{t("Nome della lista")}<input name="title" required maxLength={100} defaultValue={initial?.title} placeholder={t("Es. Il mio compleanno")} onInput={event => event.currentTarget.setCustomValidity("")} /></label>
      <label>{t("Descrizione") + " "}<span className="optional">{t("facoltativa")}</span><textarea name="description" maxLength={2000} rows={3} defaultValue={initial?.description} placeholder={t("Aggiungi una nota per i tuoi amici")} /></label>
      <label>{t("Data dell’occasione") + " "}<span className="optional">{t("facoltativa")}</span><input type="date" name="date" defaultValue={initial?.date} /></label>
      <PhotoField value={photo} imageUrl={imageUrl} disabled={pending} onPreparing={setPreparing} onChange={value => { setPhoto(value); setDirty(true); }} />
      <fieldset className="cover-picker"><legend>{t("Scegli l’atmosfera")}</legend><div className="cover-options">{(["plum", "sage", "sand"] as const).map((color, index) => <button key={color} type="button" className={`cover-option ${cover === color ? "selected" : ""}`} aria-label={[t("Nero"), t("Argento"), t("Oro")][index]} aria-pressed={cover === color} onClick={() => { setCover(color); setDirty(true); }}><span className="cover-option-preview"><CoverArt cover={color} preview /></span><span>{[t("Nero"), t("Argento"), t("Oro")][index]}{cover === color && <span aria-hidden="true"> ✓</span>}</span></button>)}</div></fieldset>
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      {!initial && creationBlocked && <p className="beta-limit-note" role="status">{t(creationBlocked)}</p>}
      <div className="form-actions"><button type="submit" disabled={pending || preparing || Boolean(!initial && creationBlocked)} className="button primary">{pending ? t("Salvataggio…") : initial ? t("Salva modifiche") : t("Crea la tua lista")}<ArrowRight size={17} /></button></div>
      {!initial && onImport && <button type="button" className="list-import-entry" disabled={pending || preparing || Boolean(creationBlocked)} onClick={() => { if (!dirty || window.confirm(t("Vuoi chiudere e perdere le modifiche?"))) onImport(); }}>{t("Importa JSON")}</button>}
      </fieldset>
    </form>
  </Dialog>;
}

export function GiftForm({ initial, imageUrl, onClose, onSave, onPreview, creationBlocked, pending = false, error: saveError }: { initial?: Gift; imageUrl?: string | null; onClose: () => void; onSave: (gift: Omit<Gift, "id">, photo: PhotoChange) => void; onPreview?: (url: string) => Promise<LinkPreview>; creationBlocked?: string; pending?: boolean; error?: string }) {
  const { t } = useI18n();
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [preparing, setPreparing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewNote, setPreviewNote] = useState("");
  const [locationsOpen, setLocationsOpen] = useState(Boolean(initial?.url || initial?.shop));
  const form = useRef<HTMLFormElement>(null);
  const showPreview = Boolean(onPreview) && !initial;
  async function fillFromLink() {
    if (previewing || pending || !onPreview) return;
    const url = safeUrl(productUrl.trim());
    if (!url) { setPreviewNote("Inserisci un link che inizi con http o https."); return; }
    setPreviewing(true); setPreviewNote("");
    try {
      const preview = await onPreview(url);
      const fields = form.current?.elements;
      // Only empty fields are filled: anything the person already typed stays untouched.
      const fill = (name: string, value?: string) => {
        const field = fields?.namedItem(name);
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || value === undefined || field.value.trim()) return false;
        field.value = value; return true;
      };
      const filled = [fill("title", preview.title), fill("description", preview.description), fill("price", preview.priceCents === undefined ? undefined : (preview.priceCents / 100).toFixed(2))].filter(Boolean).length;
      fill("url", preview.url);
      setLocationsOpen(true); setDirty(true); setError("");
      setPreviewNote(filled ? "Abbiamo compilato i campi con i dati del sito. Controllali prima di salvare." : preview.fetched ? "La pagina non riporta dettagli leggibili. Il link è salvato: completa il resto a mano." : "Non siamo riusciti a leggere il sito. Il link è salvato: completa il resto a mano.");
    } catch (failure) {
      const data = (failure as { data?: unknown }).data;
      setPreviewNote(typeof data === "string" ? data : "Non siamo riusciti a leggere il sito. Riprova o completa i campi a mano.");
    } finally { setPreviewing(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || preparing || (!initial && creationBlocked)) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    // A pasted product link counts as the online location even if the person never asked for a preview.
    const urlValue = String(form.get("url")).trim() || productUrl.trim();
    const url = urlValue ? safeUrl(urlValue) : undefined;
    if (!title) { setError("Scrivi il nome del regalo."); return; }
    if (urlValue && !url) { setError("Inserisci un link che inizi con http o https."); return; }
    const rawPrice = String(form.get("price"));
    const priceCents = rawPrice === "" ? undefined : Math.round(Number(rawPrice) * 100);
    if (priceCents !== undefined && (!Number.isSafeInteger(priceCents) || priceCents < 0)) { setError("Inserisci un prezzo valido."); return; }
    const category = String(form.get("category")) as Category;
    setError("");
    onSave({ title, description: String(form.get("description")).trim(), priceCents, category, favorite: form.get("favorite") === "on", url, shop: String(form.get("shop")).trim() || undefined, shopAddress: String(form.get("shopAddress")).trim() || undefined }, photo);
  }
  return <Dialog title={initial ? t("Modifica regalo") : t("Nuovo regalo")} subtitle={t("Aggiungi i dettagli utili e indica dove acquistarlo.")} onClose={() => { if (!pending && !preparing) onClose(); }} dirty={dirty}>
    <form ref={form} className="form" onSubmit={submit} onChange={() => setDirty(true)}>
      {showPreview && <div className="link-prefill">
        <label>{t("Hai già un link?") + " "}<span className="optional">{t("facoltativo")}</span><input type="url" name="productUrl" inputMode="url" maxLength={2048} value={productUrl} placeholder="https://…" onChange={event => setProductUrl(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void fillFromLink(); } }} /></label>
        <button type="button" className={previewing ? "button secondary busy" : "button secondary"} disabled={previewing || pending || !productUrl.trim()} onClick={() => void fillFromLink()}>{previewing ? <><LoaderCircle size={16} aria-hidden="true" />{t("Lettura del sito…")}</> : <><Sparkles size={16} aria-hidden="true" />{t("Compila dal sito")}</>}</button>
        <p className="form-hint" role="status" aria-live="polite">{previewNote ? t(previewNote) : t("Incolla il link del prodotto: proviamo a ricavare nome, prezzo e descrizione. Potrai correggere tutto.")}</p>
      </div>}
      <label>{t("Nome del regalo")}<input name="title" data-autofocus required maxLength={150} defaultValue={initial?.title} placeholder={t("Es. Un vaso fatto a mano")} /></label>
      <label>{t("Descrizione")}<textarea name="description" rows={3} maxLength={3000} defaultValue={initial?.description} placeholder={t("Taglia, colore, modello… o perché lo desideri.")} /></label>
      <PhotoField label="Foto del regalo" value={photo} imageUrl={imageUrl} disabled={pending} onPreparing={setPreparing} onChange={value => { setPhoto(value); setDirty(true); }} />
      <div className="form-row"><label>{t("Prezzo indicativo (€)")}<input name="price" type="number" min="0" max="1000000" step="0.01" defaultValue={initial?.priceCents !== undefined ? initial.priceCents / 100 : ""} placeholder={t("Es. 45")} /></label><label>{t("Categoria")}<select name="category" defaultValue={initial?.category ?? "other"}>{initial?.category === "books" && <option value="books">{t(categories.books)}</option>}{Object.entries(giftCategories).map(([key, label]) => <option value={key} key={key}>{t(label)}</option>)}</select></label></div>
      <details className="form-details" open={locationsOpen} onToggle={event => setLocationsOpen(event.currentTarget.open)}><summary>{t("Dove trovarlo") + " "}<span className="optional">{t("facoltativo")}</span></summary><label>{t("Link online")}<input name="url" type="url" maxLength={2048} defaultValue={initial?.url} placeholder="https://…" /></label><label>{t("Negozio fisico")}<input name="shop" maxLength={150} defaultValue={initial?.shop} placeholder={t("Nome del negozio")} /></label><label>{t("Indirizzo del negozio") + " "}<span className="optional">{t("facoltativo")}</span><input name="shopAddress" maxLength={300} defaultValue={initial?.shopAddress} placeholder={t("Via e città")} /></label></details>
      <label className="checkbox-field"><input type="checkbox" name="favorite" defaultChecked={initial?.favorite} /><Heart size={17} /><span>{t("Lo desidero particolarmente")}</span></label>
      {(error || saveError) && <p className="form-error" role="alert">{t(error || saveError || "")}</p>}
      {!initial && creationBlocked && <p className="beta-limit-note" role="status">{t(creationBlocked)}</p>}
      <div className="form-actions"><button type="submit" disabled={pending || preparing || Boolean(!initial && creationBlocked)} className="button primary">{pending ? t("Salvataggio…") : initial ? t("Salva regalo") : t("Aggiungi alla lista")}<ArrowRight size={17} /></button></div>
    </form>
  </Dialog>;
}
