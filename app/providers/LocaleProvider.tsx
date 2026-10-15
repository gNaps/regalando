"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isLocale, localeCookie, localeCookieMaxAge, translator, type Locale } from "@/lib/i18n";
import { formatDate, formatPrice } from "@/lib/domain";

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, updateLocale] = useState(initialLocale);
  const router = useRouter();
  const setLocale = useCallback((value: Locale) => {
    if (!isLocale(value)) return;
    document.cookie = `${localeCookie}=${value}; Path=/; Max-Age=${localeCookieMaxAge}; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    updateLocale(value);
    router.refresh();
  }, [router]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const context = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={context}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useI18n requires LocaleProvider");
  const { locale, setLocale } = context;
  return useMemo(() => ({
    locale, setLocale, t: translator(locale),
    formatDate: (date?: string) => formatDate(date, new Date(), locale),
    formatPrice: (cents?: number) => formatPrice(cents, locale),
  }), [locale, setLocale]);
}
