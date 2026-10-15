"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useEffect, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { LoaderCircle } from "lucide-react";
import { Brand } from "../ui/brand";

export function ProfileBootstrap({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { userId } = useAuth();
  const ensureProfile = useMutation(api.profiles.ensure);
  const [readyUser, setReadyUser] = useState<string | null>(null);
  const [errorUser, setErrorUser] = useState<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let active = true;
    ensureProfile({}).then(() => { if (active) { setErrorUser(null); setReadyUser(userId); } }).catch(() => { if (active) setErrorUser(userId); });
    return () => { active = false; };
  }, [isAuthenticated, ensureProfile, userId]);
  if ((userId && errorUser === userId) || (!isLoading && !isAuthenticated)) return <main className="setup-page"><Brand href="/" /><h1>{t("Non siamo riusciti ad aprire il tuo spazio.")}</h1><p>{t("Non è stato possibile verificare il tuo accesso. Riprova tra poco.")}</p><button className="button primary" onClick={() => window.location.reload()}>{t("Riprova")}</button></main>;
  if (!userId || readyUser !== userId || !isAuthenticated) return <main className="setup-page"><Brand href="/" /><div className="loading-state" role="status"><LoaderCircle size={20} />{t("Prepariamo il tuo spazio…")}</div></main>;
  return children;
}
