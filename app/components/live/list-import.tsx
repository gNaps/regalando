"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, FileJson, LoaderCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { categories, plural } from "@/lib/domain";
import { ListImportError, maxListImportBytes, parseListImport, type ImportedList } from "@/lib/list-import";
import { useI18n } from "@/app/providers/LocaleProvider";
import { Dialog } from "../ui/dialog";

export function ListImport({ onClose, creationBlocked }: { onClose: () => void; creationBlocked?: string }) {
  const { t, formatDate, formatPrice } = useI18n();
  const importJson = useMutation(api.lists.importJson);
  const router = useRouter();
  const [prepared, setPrepared] = useState<{ json: string; list: ImportedList; filename: string } | null>(null);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [pending, setPending] = useState(false);
  const readVersion = useRef(0);
  const saving = useRef(false);
  useEffect(() => () => { readVersion.current++; }, []);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const version = ++readVersion.current;
    setPrepared(null); setError(null); setReading(true);
    try {
      if (file.size > maxListImportBytes) throw new ListImportError("Il file supera il limite di 512 KB.");
      const json = await file.text();
      const list = parseListImport(json);
      if (version === readVersion.current) setPrepared({ json, list, filename: file.name });
    } catch (failure) {
      if (version === readVersion.current) setError(failure instanceof ListImportError ? failure : { message: "Non siamo riusciti a leggere il file. Selezionalo di nuovo." });
    } finally { if (version === readVersion.current) setReading(false); }
  }

  async function save() {
    if (!prepared || saving.current || creationBlocked) return;
    saving.current = true; setPending(true); setError(null);
    try {
      const id = await importJson({ json: prepared.json });
      onClose(); router.push(`/lists/${id}`);
    } catch (failure) {
      const data = (failure as { data?: unknown })?.data;
      setError(typeof data === "string" ? { message: data } : data && typeof data === "object" && "message" in data && typeof data.message === "string"
        ? { message: data.message, field: "field" in data && typeof data.field === "string" ? data.field : undefined }
        : { message: "Non siamo riusciti a importare la lista. Il file è ancora pronto: riprova." });
    } finally { saving.current = false; setPending(false); }
  }

  return <Dialog title={t("Importa una lista")} subtitle={t("Carica un file JSON e controlla l’anteprima prima di creare la lista.")} onClose={() => { if (!saving.current) onClose(); }}>
    <div className="form list-import-form" aria-busy={reading || pending}>
      <label>{t("File JSON")}<input type="file" accept=".json,application/json" onChange={selectFile} disabled={pending || Boolean(creationBlocked)} aria-describedby="list-import-help" /></label>
      <p id="list-import-help" className="auth-hint">{t("Massimo 512 KB e 15 regali. Durante la beta il piano gratuito include 3 liste per account.")}</p>
      <a href="/examples/lista.json" download="lista-esempio.json" className="text-link"><Download size={16} aria-hidden="true" />{t("Scarica il JSON di esempio")}</a>
      {reading && <p className="auth-hint" role="status"><LoaderCircle size={16} aria-hidden="true" />{t("Lettura del file…")}</p>}
      {prepared && <section className="list-import-preview" aria-label={t("Anteprima dell’importazione")}>
        <p className="list-import-filename"><FileJson size={16} aria-hidden="true" />{prepared.filename}</p>
        <h3>{prepared.list.title}</h3>
        {prepared.list.description && <p>{prepared.list.description}</p>}
        <p>{formatDate(prepared.list.date)} · {plural(prepared.list.gifts.length, t("desiderio"), t("desideri"))}</p>
        {prepared.list.gifts.length > 0 && <ul>{prepared.list.gifts.map((gift, index) => <li key={index}><strong>{gift.title}</strong><span>{t(categories[gift.category])} · {formatPrice(gift.priceCents)}</span></li>)}</ul>}
      </section>}
      {error && <p className="form-error" role="alert">{t(error.message)}{error.field && <> <span className="list-import-error-field">({error.field})</span></>}</p>}
      {creationBlocked && <p className="beta-limit-note" role="status">{t(creationBlocked)}</p>}
      <div className="form-actions"><button className="button primary" type="button" disabled={!prepared || reading || pending || Boolean(creationBlocked)} onClick={save}>{pending ? t("Importazione…") : t("Importa e crea la lista")}<ArrowRight size={17} aria-hidden="true" /></button></div>
    </div>
  </Dialog>;
}
