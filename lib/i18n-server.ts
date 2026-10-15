import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { localeCookie, resolveLocale, translator } from "./i18n";

export const getI18n = cache(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(cookieStore.get(localeCookie)?.value, requestHeaders.get("accept-language") ?? "");
  return { locale, t: translator(locale) };
});
