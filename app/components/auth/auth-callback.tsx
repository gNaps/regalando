"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { HandleSSOCallback, useSession, TaskChooseOrganization, TaskResetPassword, TaskSetupMFA } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthHeading, useAuthNavigation } from "./auth-controls";
import { authRedirect } from "@/lib/auth";

export function AuthCallback() {
  const { t } = useI18n();
  const router = useRouter();
  const { navigate, link } = useAuthNavigation();
  return <><AuthHeading title={t("Ti stiamo facendo entrare")}>{t("Stiamo completando l’accesso al tuo spazio.")}</AuthHeading><p role="status">{t("Un momento…")}</p><HandleSSOCallback navigateToApp={navigate} navigateToSignIn={() => router.replace(link("/sign-in"))} navigateToSignUp={() => router.replace(link("/sign-up"))} /></>;
}

export function AuthTasks() {
  const { t } = useI18n();
  const { session, isLoaded } = useSession();
  const router = useRouter();
  const { link } = useAuthNavigation();
  const task = session?.currentTask?.key;
  useEffect(() => {
    if (!isLoaded) return;
    if (!session) router.replace(link("/sign-in"));
    else if (!task) router.replace(authRedirect(new URLSearchParams(window.location.search).get("redirect_url"), window.location.origin));
  }, [isLoaded, session, task, router, link]);
  const destination = link("/sign-in/tasks");
  return <><AuthHeading title={task ? t("Completa l’accesso") : t("Ti stiamo facendo entrare")}>{t("Ancora un passaggio per accedere al tuo spazio.")}</AuthHeading>{task === "choose-organization" ? <TaskChooseOrganization redirectUrlComplete={destination} /> : task === "reset-password" ? <TaskResetPassword redirectUrlComplete={destination} /> : task === "setup-mfa" ? <TaskSetupMFA redirectUrlComplete={destination} /> : <p role="status">{t("Un momento…")}</p>}</>;
}
