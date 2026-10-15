"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import Link from "next/link";

export function LegalLinks() {
  const { t } = useI18n();
  return <nav className="legal-links" aria-label={t("Informazioni legali")}>
    <Link href="/privacy">{t("Privacy")}</Link>
    <Link href="/cookie">{t("Cookie")}</Link>
  </nav>;
}
