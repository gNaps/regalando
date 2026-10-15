import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { getI18n } from "@/lib/i18n-server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/require-session";
import { Brand } from "../components/ui/brand";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Configurazione") };
}

export default async function SetupPage() {
  const { t } = await getI18n();
  if (isConfigured()) redirect("/lists");
  return <main className="setup-page"><Brand href="/" /><LanguageSwitcher /><span className="eyebrow">{t("CONFIGURAZIONE INCOMPLETA")}</span><h1>{t("Regalando non è")}<br />{t("ancora pronto.")}</h1><p>{t("Mancano alcune impostazioni dell’app, quindi l’accesso è temporaneamente disattivato.")}</p><p>{t("Per chi sviluppa: configura Clerk e Convex seguendo il README. Servono") + " "}<code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>, <code>CLERK_SECRET_KEY</code>, <code>NEXT_PUBLIC_CONVEX_URL</code> {" " + t("e un backend configurato con l’issuer Clerk.")}</p></main>;
}
