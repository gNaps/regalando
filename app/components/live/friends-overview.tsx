"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoaderCircle } from "lucide-react";
import { ListCollection } from "../ui/list-collection";
export function FriendsOverview() {
  const { t } = useI18n();
  const lists = useQuery(api.lists.getJoined);
  if (!lists) return <div className="loading-state" role="status"><LoaderCircle size={20} />{t("Caricamento delle liste degli amici…")}</div>;
  return <ListCollection lists={lists.map(list => ({ ...list, archived: list.status === "archived" }))} basePath="/lists" friends />;
}
