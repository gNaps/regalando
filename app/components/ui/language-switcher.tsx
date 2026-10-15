"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import { isLocale } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return <label className="language-switcher" title="Italiano / English"><span className="sr-only">{t("Lingua")}</span><select value={locale} onChange={event => { if (isLocale(event.target.value)) setLocale(event.target.value); }}><option value="it" lang="it" aria-label="Italiano">IT</option><option value="en" lang="en" aria-label="English">EN</option></select></label>;
}
