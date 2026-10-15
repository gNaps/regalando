import { LocalizedClerkProvider } from "@/app/providers/LocalizedClerkProvider";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "../providers/ConvexClientProvider";
import { ProfileBootstrap } from "../components/live/profile-bootstrap";
import { LiveShell } from "../components/live/shell";
import { requireSession } from "@/lib/require-session";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  // Serve anche qui: ProfileBootstrap non renderizza la pagina senza sessione, quindi il redirect
  // della pagina non verrebbe mai eseguito. Le pagine ripetono il controllo perché il layout
  // non si riesegue a ogni navigazione.
  await requireSession();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL!;
  return <LocalizedClerkProvider><ConvexClientProvider url={url}><ProfileBootstrap><LiveShell>{children}</LiveShell></ProfileBootstrap></ConvexClientProvider></LocalizedClerkProvider>;
}
