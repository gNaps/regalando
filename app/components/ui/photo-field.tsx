"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useI18n } from "@/app/providers/LocaleProvider";
import { prepareImage } from "@/lib/prepare-image";

export type PhotoChange = Blob | null | undefined;

export function PhotoField({ value, imageUrl, label = "Foto della lista", disabled, onChange, onPreparing }: {
  value: PhotoChange; imageUrl?: string | null; label?: string; disabled?: boolean;
  onChange: (photo: PhotoChange) => void; onPreparing: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const currentUrl = preview || (value === undefined ? imageUrl : null);
  async function choose(file?: File) {
    if (!file || busy || disabled) return;
    setBusy(true); onPreparing(true); setError("");
    try {
      const photo = await prepareImage(file);
      setPreview(URL.createObjectURL(photo)); onChange(photo);
    } catch (error) { setError(error instanceof Error ? error.message : "Immagine non valida. Scegli un’altra foto."); }
    finally { setBusy(false); onPreparing(false); }
  }
  return <div className="photo-field" aria-busy={busy}>
    <label htmlFor={id}>{t(label)} <span className="optional">{t("facoltativa")}</span></label>
    {currentUrl && <div className="image-editor-preview"><Image src={currentUrl} alt={t("Anteprima della foto")} width={500} height={220} unoptimized /></div>}
    <div className="photo-field-controls">
      <label className="button secondary photo-field-choose" htmlFor={id}>{busy ? <LoaderCircle size={16} className="image-spinner" aria-hidden="true" /> : <ImagePlus size={16} aria-hidden="true" />}{busy ? t("Preparazione foto…") : currentUrl ? t("Sostituisci foto") : t("Scegli una foto")}
        <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} aria-describedby={`${id}-hint`} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
      </label>
      {currentUrl && <button type="button" className="subtle-button" disabled={disabled || busy} onClick={() => { setPreview(null); setError(""); onChange(null); }}><Trash2 size={15} aria-hidden="true" />{t("Rimuovi foto")}</button>}
    </div>
    <p id={`${id}-hint`} className="form-hint">{t("JPG, PNG o WebP, fino a 10 MB. Riduciamo la foto a massimo 1200 px e 250 KB prima di caricarla.")}</p>
    {value instanceof Blob && <p className="form-hint" role="status">{t("Foto pronta: {0} KB", { "0": Math.ceil(value.size / 1024) })}</p>}
    {error && <p className="form-error" role="alert">{t(error)}</p>}
  </div>;
}
