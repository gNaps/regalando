import { getI18n } from "@/lib/i18n-server";
import { Suspense } from "react";
import { AuthTasks } from "@/app/components/auth/auth-callback";
export default async function TasksPage() {
  const { t } = await getI18n(); return <Suspense fallback={<p role="status">{t("Accesso in corso…")}</p>}><AuthTasks /></Suspense>; }
