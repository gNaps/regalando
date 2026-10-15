import { LanguageSwitcher } from "@/app/components/ui/language-switcher";
import { getI18n } from "@/lib/i18n-server";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { LocalizedClerkProvider } from "@/app/providers/LocalizedClerkProvider";
import { requireConfig } from "@/lib/require-session";
import { ConvexClientProvider } from "@/app/providers/ConvexClientProvider";
import { Brand } from "@/app/components/ui/brand";
import { LegalLinks } from "@/app/components/ui/legal-links";
import { InviteAccount } from "@/app/components/live/invite-entry";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Un invito per te"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function InviteLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  requireConfig();
  return <LocalizedClerkProvider><ConvexClientProvider url={process.env.NEXT_PUBLIC_CONVEX_URL!}><div className="app-shell"><header className="app-header"><div className="header-inner"><Brand href="/" /><div className="header-account"><LanguageSwitcher /><InviteAccount /></div></div></header><main className="main-content invite-main">{children}</main><footer className="app-footer"><span className="brand-tagline">{t("Quello che ami, per chi ti ama.")}</span><LegalLinks /></footer></div></ConvexClientProvider></LocalizedClerkProvider>;
}
