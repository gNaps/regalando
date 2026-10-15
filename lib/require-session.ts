import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

/** Controllo di configurazione, senza sessione: adatto ai layout. */
export function requireConfig() {
  if (!isConfigured()) redirect("/setup");
}

/** Configurazione e sessione: da chiamare nelle pagine, vicino ai dati. */
export async function requireSession() {
  requireConfig();
  await auth.protect();
}
