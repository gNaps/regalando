import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getI18n } from "@/lib/i18n-server";
import { LocaleProvider } from "./providers/LocaleProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const editorialSerif = localFont({
  src: "./fonts/Lora-ItalicVF.ttf",
  variable: "--font-editorial-serif",
  weight: "400 700",
  style: "italic",
  display: "swap",
  fallback: ["Georgia"],
  adjustFontFallback: "Times New Roman",
});
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t("Regalando — desideri in buona compagnia"), template: "%s · Regalando" },
    description: t("Le tue liste regalo, condivise con chi ti conosce. Ogni desiderio trova il suo regalo, ogni sorpresa resta una sorpresa."),
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale } = await getI18n();
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${editorialSerif.variable} antialiased`}><LocaleProvider initialLocale={locale}>{children}</LocaleProvider></body>
    </html>
  );
}
