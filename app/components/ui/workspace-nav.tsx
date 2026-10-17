"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, Users } from "lucide-react";
export function WorkspaceNav() {
  const { t } = useI18n();
  const path = usePathname();
  if (path.startsWith("/lists/")) return null;
  return <nav className="workspace-nav" aria-label={t("Il tuo spazio")}><Link href="/lists" aria-current={path === "/lists" ? "page" : undefined}><Gift size={16} />{t("Le mie liste")}</Link><Link href="/friends" aria-current={path === "/friends" ? "page" : undefined}><Users size={16} />{t("Liste degli amici")}</Link></nav>;
}
