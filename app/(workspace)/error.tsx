"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return <div className="empty-state" role="alert"><ShieldCheck size={30} /><h2>{t("Non possiamo aprire questa pagina")}</h2><p>{t("La lista potrebbe non essere disponibile oppure la connessione è stata interrotta.")}</p><button className="button primary" onClick={reset}>{t("Riprova")}</button><Link className="text-link" href="/lists">{t("Torna alle tue liste")}</Link></div>;
}
