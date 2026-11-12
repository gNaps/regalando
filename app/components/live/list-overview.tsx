"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { type PhotoChange } from "@/app/components/ui/photo-field";
import { ListForm } from "@/app/components/ui/forms";
import { ListCollection } from "@/app/components/ui/list-collection";
import { type WishList } from "@/lib/domain";
import { ListImport } from "./list-import";
import { betaLimits, betaListLimitMessage } from "@/lib/beta-limits";

export default function LiveListsPage() {
  const { t } = useI18n();
  const lists = useQuery(api.lists.getOwned);
  const saveList = useAction(api.listEditor.save);
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const creationBlocked = lists && lists.length >= betaLimits.listsPerPerson ? betaListLimitMessage : undefined;
  async function save(values: Pick<WishList, "title" | "description" | "date" | "cover">, photo: PhotoChange) {
    if (pending) return;
    if (creationBlocked) { setError(creationBlocked); return; }
    setPending(true); setError("");
    try { const id = await saveList({ ...values, photo: photo instanceof Blob ? await photo.arrayBuffer() : photo }); setCreate(false); router.push(`/lists/${id}`); }
    catch (error) { const data = (error as { data?: unknown })?.data; setError(typeof data === "string" ? data : "Non siamo riusciti a salvare la lista. I dati del modulo sono ancora disponibili: riprova."); }
    finally { setPending(false); }
  }
  if (!lists) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento delle tue liste…")}</div>;
  return <><ListCollection lists={lists.map(list => ({ ...list, archived: list.status === "archived" }))} basePath="/lists" creationBlocked={creationBlocked} onCreate={() => { setError(""); setCreate(true); }} />{create && <ListForm creationBlocked={creationBlocked} onImport={() => { setCreate(false); setImporting(true); }} pending={pending} error={t(error)} onClose={() => { if (!pending) setCreate(false); }} onSave={save} />}{importing && <ListImport creationBlocked={creationBlocked} onClose={() => setImporting(false)} />}</>;
}
