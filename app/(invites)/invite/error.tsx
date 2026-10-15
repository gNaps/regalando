"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import Link from "next/link";
export default function InviteError({ reset }: { reset: () => void }) {
  const { t } = useI18n();
  return <div className="empty-state" role="alert"><h1>{t("Non possiamo aprire l’invito")}</h1><p>{t("La connessione potrebbe essere stata interrotta. Riprova tra poco.")}</p><button className="button primary" onClick={reset}>{t("Riprova")}</button><Link className="text-link" href="/">{t("Torna alla home")}</Link></div>;
}
