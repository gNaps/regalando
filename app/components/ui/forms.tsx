"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState, type FormEvent } from "react";
import { ArrowRight, Heart } from "lucide-react";
import { categories, giftCategories, safeUrl, type WishList, type Gift, type Cover, type Category } from "@/lib/domain";
import { Dialog } from "../ui/dialog";
import { CoverArt } from "../ui/artwork";

export function ListForm({ initial, onClose, onSave, pending = false, error }: { initial?: Pick<WishList, "title" | "description" | "date" | "cover">; onClose: () => void; onSave: (values: Pick<WishList, "title" | "description" | "date" | "cover">) => void; pending?: boolean; error?: string }) {
  const { t } = useI18n();
  const [cover, setCover] = useState<Cover>(initial?.cover ?? "plum");
  const [dirty, setDirty] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title")).trim();
    if (!title) { const input = event.currentTarget.querySelector<HTMLInputElement>("[name=title]"); input?.setCustomValidity(t("Scrivi un titolo per la lista.")); input?.reportValidity(); return; }
    onSave({ title, description: String(data.get("description")).trim(), date: String(data.get("date")) || undefined, cover });
  }
  return <Dialog title={initial ? t("Modifica lista") : t("Nuova lista")} subtitle={t("Scegli un nome e aggiungi i dettagli dell’occasione.")} onClose={onClose} dirty={dirty}>
    <form className="form" onSubmit={submit} onChange={() => setDirty(true)}>
      <label>{t("Nome della lista")}<input name="title" required maxLength={100} defaultValue={initial?.title} placeholder={t("Es. Il mio compleanno")} onInput={event => event.currentTarget.setCustomValidity("")} /></label>
      <label>{t("Descrizione") + " "}<span className="optional">{t("facoltativa")}</span><textarea name="description" maxLength={2000} rows={3} defaultValue={initial?.description} placeholder={t("Aggiungi una nota per i tuoi amici")} /></label>
      <label>{t("Data dell’occasione") + " "}<span className="optional">{t("facoltativa")}</span><input type="date" name="date" defaultValue={initial?.date} /></label>
      <fieldset className="cover-picker"><legend>{t("Scegli l’atmosfera")}</legend><div className="cover-options">{(["plum", "sage", "sand"] as const).map((color, index) => <button key={color} type="button" className={`cover-option ${cover === color ? "selected" : ""}`} aria-label={[t("Nero"), t("Argento"), t("Oro")][index]} aria-pressed={cover === color} onClick={() => { setCover(color); setDirty(true); }}><span className="cover-option-preview"><CoverArt cover={color} preview /></span><span>{[t("Nero"), t("Argento"), t("Oro")][index]}{cover === color && <span aria-hidden="true"> ✓</span>}</span></button>)}</div></fieldset>
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      <div className="form-actions"><button type="submit" disabled={pending} className="button primary">{pending ? t("Salvataggio…") : initial ? t("Salva modifiche") : t("Crea la tua lista")}<ArrowRight size={17} /></button></div>
    </form>
  </Dialog>;
}

export function GiftForm({ initial, onClose, onSave, pending = false, error: saveError }: { initial?: Gift; onClose: () => void; onSave: (gift: Omit<Gift, "id">) => void; pending?: boolean; error?: string }) {
  const { t } = useI18n();
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title")).trim();
    const urlValue = String(form.get("url")).trim();
    const url = urlValue ? safeUrl(urlValue) : undefined;
    if (!title) { setError("Scrivi il nome del regalo."); return; }
    if (urlValue && !url) { setError("Inserisci un link che inizi con http o https."); return; }
    const rawPrice = String(form.get("price"));
    const priceCents = rawPrice === "" ? undefined : Math.round(Number(rawPrice) * 100);
    if (priceCents !== undefined && (!Number.isSafeInteger(priceCents) || priceCents < 0)) { setError("Inserisci un prezzo valido."); return; }
    const category = String(form.get("category")) as Category;
    setError("");
    onSave({ title, description: String(form.get("description")).trim(), priceCents, category, favorite: form.get("favorite") === "on", url, shop: String(form.get("shop")).trim() || undefined, shopAddress: String(form.get("shopAddress")).trim() || undefined });
  }
  return <Dialog title={initial ? t("Modifica regalo") : t("Nuovo regalo")} subtitle={t("Aggiungi i dettagli utili e indica dove acquistarlo.")} onClose={onClose} dirty={dirty}>
    <form className="form" onSubmit={submit} onChange={() => setDirty(true)}>
      <label>{t("Nome del regalo")}<input name="title" required maxLength={150} defaultValue={initial?.title} placeholder={t("Es. Un vaso fatto a mano")} /></label>
      <label>{t("Descrizione")}<textarea name="description" rows={3} maxLength={3000} defaultValue={initial?.description} placeholder={t("Taglia, colore, modello… o perché lo desideri.")} /></label>
      <div className="form-row"><label>{t("Prezzo indicativo (€)")}<input name="price" type="number" min="0" max="1000000" step="0.01" defaultValue={initial?.priceCents !== undefined ? initial.priceCents / 100 : ""} placeholder={t("Es. 45")} /></label><label>{t("Categoria")}<select name="category" defaultValue={initial?.category ?? "other"}>{initial?.category === "books" && <option value="books">{t(categories.books)}</option>}{Object.entries(giftCategories).map(([key, label]) => <option value={key} key={key}>{t(label)}</option>)}</select></label></div>
      <details className="form-details" open={Boolean(initial?.url || initial?.shop)}><summary>{t("Dove trovarlo") + " "}<span className="optional">{t("facoltativo")}</span></summary><label>{t("Link online")}<input name="url" type="url" maxLength={2048} defaultValue={initial?.url} placeholder="https://…" /></label><label>{t("Negozio fisico")}<input name="shop" maxLength={150} defaultValue={initial?.shop} placeholder={t("Nome del negozio")} /></label><label>{t("Indirizzo del negozio") + " "}<span className="optional">{t("facoltativo")}</span><input name="shopAddress" maxLength={300} defaultValue={initial?.shopAddress} placeholder={t("Via e città")} /></label></details>
      <label className="checkbox-field"><input type="checkbox" name="favorite" defaultChecked={initial?.favorite} /><Heart size={17} /><span>{t("Lo desidero particolarmente")}</span></label>
      {(error || saveError) && <p className="form-error" role="alert">{t(error || saveError || "")}</p>}
      <div className="form-actions"><button type="submit" disabled={pending} className="button primary">{pending ? t("Salvataggio…") : initial ? t("Salva regalo") : t("Aggiungi alla lista")}<ArrowRight size={17} /></button></div>
    </form>
  </Dialog>;
}
