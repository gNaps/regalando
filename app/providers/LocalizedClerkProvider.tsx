"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { itIT } from "@clerk/localizations/it-IT";
import { enUS } from "@clerk/localizations/en-US";
import type { ReactNode } from "react";
import { clerkProviderProps } from "@/lib/clerk-provider-props";
import { useI18n } from "./LocaleProvider";

export function LocalizedClerkProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <ClerkProvider {...clerkProviderProps} localization={locale === "it" ? itIT : enUS}>{children}</ClerkProvider>;
}
