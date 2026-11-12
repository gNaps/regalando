import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { getI18n } from "@/lib/i18n-server";
import { LocalizedClerkProvider } from "@/app/providers/LocalizedClerkProvider";
import type { ReactNode } from "react";
import { requireConfig } from "@/lib/require-session";
import { Brand } from "../components/ui/brand";
import { LegalLinks } from "../components/ui/legal-links";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/app/components/auth/auth-form-skeleton";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  requireConfig();
  return <LocalizedClerkProvider><div className="auth-page"><header className="auth-header"><Brand href="/" /><LanguageSwitcher /><Link href="/" className="auth-home-link">{t("Torna alla home")}</Link></header><div className="auth-layout"><aside className="auth-story"><span className="eyebrow">{t("DESIDERI DA CONDIVIDERE")}</span><h2>{t("Quello che ami,")}<br /><em>{t("per chi ti ama.")}</em></h2><p>{t("Raccogli le tue idee regalo, condividi la lista e lascia a chi ti vuole bene il piacere di sorprenderti.")}</p><Image src="/images/cover-gold.webp" alt="" width={360} height={360} loading="eager" /></aside><main className="auth-panel"><Suspense fallback={<AuthFormSkeleton neutral />}>{children}</Suspense><noscript>{t("Per accedere devi attivare JavaScript nel browser.")}</noscript></main></div><footer><span className="brand-tagline">{t("Quello che ami, per chi ti ama.")}</span><LegalLinks /></footer></div></LocalizedClerkProvider>;
}
