"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { LoaderCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ListForm } from "@/app/components/ui/forms";
import { ListCollection } from "@/app/components/ui/list-collection";
import { type WishList } from "@/lib/domain";

export default function LiveListsPage() {
  const { t } = useI18n();
  const lists = useQuery(api.lists.getOwned);
  const createList = useMutation(api.lists.create);
  const router = useRouter();
  const [create, setCreate] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function save(values: Pick<WishList, "title" | "description" | "date" | "cover">) {
    if (pending) return;
    setPending(true); setError("");
    try { const id = await createList(values); setCreate(false); router.push(`/lists/${id}`); }
    catch { setError("Non siamo riusciti a salvare la lista. I dati del modulo sono ancora disponibili: riprova."); }
    finally { setPending(false); }
  }
  if (!lists) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento delle tue liste…")}</div>;
  return <><ListCollection lists={lists.map(list => ({ ...list, archived: list.status === "archived" }))} basePath="/lists" onCreate={() => { setError(""); setCreate(true); }} />{create && <ListForm pending={pending} error={t(error)} onClose={() => { if (!pending) setCreate(false); }} onSave={save} />}</>;
}
