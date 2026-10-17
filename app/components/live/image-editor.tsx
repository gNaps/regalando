"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useI18n } from "@/app/providers/LocaleProvider";
import { prepareImage } from "@/lib/prepare-image";
import { Dialog } from "../ui/dialog";

export function ImageEditor({ listId, giftId, imageUrl, onClose }: { listId: Id<"lists">; giftId?: Id<"gifts">; imageUrl?: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const inputId = useId();
  const upload = useAction(api.images.upload);
  const remove = useMutation(api.images.remove);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function failure(error: unknown) {
    const data = (error as { data?: unknown })?.data;
    setError(typeof data === "string" ? data : t("Non siamo riusciti a salvare la foto. Riprova."));
  }
  async function choose(file?: File) {
    if (!file || busy) return;
    setBusy(true); setError("");
    try { const prepared = await prepareImage(file); setPhoto(prepared); setPreview(URL.createObjectURL(prepared)); }
    catch (error) { setError(error instanceof Error ? t(error.message) : t("Immagine non valida. Scegli un’altra foto.")); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!photo || busy) return;
    setBusy(true); setError("");
    try { await upload({ listId, giftId, bytes: await photo.arrayBuffer() }); onClose(); }
    catch (error) { failure(error); }
    finally { setBusy(false); }
  }
  async function removePhoto() {
    if (busy) return;
    setBusy(true); setError("");
    try { await remove({ listId, giftId }); onClose(); }
    catch (error) { failure(error); }
    finally { setBusy(false); }
  }
  return <Dialog title={giftId ? t("Foto del regalo") : t("Foto della lista")} subtitle={t("Una foto per raccontare meglio il tuo desiderio.")} onClose={() => { if (!busy) onClose(); }} dirty={Boolean(photo)}>
    <div className="image-editor" aria-busy={busy}>
      {(preview || imageUrl) && <div className="image-editor-preview"><Image src={preview || imageUrl || ""} alt={t("Anteprima della foto")} width={500} height={220} unoptimized /></div>}
      <label htmlFor={inputId}>{t("Scegli una foto")}</label>
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ""; }} aria-describedby={`${inputId}-hint`} />
      <p id={`${inputId}-hint`} className="form-hint">{t("JPG, PNG o WebP, fino a 10 MB. Riduciamo la foto a massimo 1200 px e 250 KB prima di caricarla.")}</p>
      {photo && <p className="form-hint" role="status">{t("Foto pronta: {0} KB", { "0": Math.ceil(photo.size / 1024) })}</p>}
      {error && <p className="form-error" role="alert">{t(error)}</p>}
      <div className="image-editor-actions">
        {imageUrl && <button className="button secondary" disabled={busy} onClick={() => void removePhoto()}><Trash2 size={16} aria-hidden="true" />{t("Rimuovi foto")}</button>}
        <button className="button primary" disabled={busy || !photo} onClick={() => void save()}>{busy ? <LoaderCircle size={16} className="image-spinner" aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}{busy ? t("Un momento…") : t("Salva foto")}</button>
      </div>
    </div>
  </Dialog>;
}
