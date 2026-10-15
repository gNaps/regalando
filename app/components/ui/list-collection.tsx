"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Gift, Heart, Plus, Search, Users, X } from "lucide-react";
import { plural, type Cover } from "@/lib/domain";
import { DesireSculpture } from "./artwork";
import { SurpriseSeal } from "./surprise-seal";

export type ListSummary = { id: string; title: string; description: string; date?: string; cover: Cover; archived: boolean; giftCount: number; owner?: string };

export function ListCollection({ lists, basePath, friends = false, onCreate }: { lists: ListSummary[]; basePath: string; friends?: boolean; onCreate?: () => void }) {
  const { t, locale, formatDate } = useI18n();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const matchingStatus = lists.filter(list => list.archived === (tab === "archived"));
  const visible = matchingStatus.filter(list => `${list.title} ${list.description} ${list.owner ?? ""}`.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const activeCount = lists.filter(list => !list.archived).length;
  function create(event: MouseEvent<HTMLButtonElement>) { event.currentTarget.focus({ preventScroll: true }); onCreate?.(); }
  return <>
    <section className="desire-stage"><div className="stage-coordinate" aria-hidden="true">{t("REGALANDO / IL TUO SPAZIO")}</div><div className="intro-copy"><span className="eyebrow"><span className="intro-dot" />{friends ? t("PENSIERI CHE LASCIANO IL SEGNO") : t("NON SERVE UN’OCCASIONE")}</span><h1>{friends ? <>{t("I loro") + " "}<span>{t("desideri.")}</span></> : <>{t("I tuoi") + " "}<span>{t("desideri.")}</span></>}</h1><p>{friends ? t("Il regalo giusto comincia da chi ami.") : <>{t("Quello che ami, in un posto tuo.")}<br />{t("Il resto è una sorpresa.")}</>}</p>{onCreate && <button className="button primary create-list-button" onClick={create}>{t("Crea una lista")}<span><Plus size={21} /></span></button>}</div><DesireSculpture /><div className="stage-bottom"><span><span className="live-dot" />{activeCount === 0 ? (friends ? t("Ancora nessuna lista condivisa") : t("La prima lista ti aspetta")) : plural(activeCount, friends ? t("lista da scoprire") : t("lista da vivere"), friends ? t("liste da scoprire") : t("liste da vivere"))}</span><span className="stage-note">{t("DESIDERARE È SOLO L’INIZIO") + " "}<ArrowRight size={15} /></span></div></section>
    <div className="collection-section"><div className="tabs" role="group" aria-label={t("Stato delle liste")}><button className={tab === "active" ? "selected" : ""} onClick={() => setTab("active")} aria-pressed={tab === "active"}>{friends ? t("Condivise con te") : t("Le mie liste")}</button><button className={tab === "archived" ? "selected" : ""} onClick={() => setTab("archived")} aria-pressed={tab === "archived"}>{t("Archiviate")}</button></div><label className="list-search"><Search size={17} /><input type="search" aria-label={t("Cerca una lista")} placeholder={t("Trova una lista")} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    <div className="list-grid">{visible.map((list, index) => <Link href={`${basePath}/${list.id}`} key={list.id} className={`list-card list-${list.cover}`}><div className="list-index" aria-hidden="true"><span>{String(index + 1).padStart(2, "0")}</span><span className="index-line" /></div><div className="list-card-body"><span className="cover-label">{friends ? t("PER {0}", { "0": list.owner?.toLocaleUpperCase(locale) ?? t("UN AMICO") }) : tab === "archived" ? t("UN BEL RICORDO") : t("LA TUA WISHLIST")}</span><h2>{list.title}</h2><p>{list.description || t("Un piccolo spazio per ciò che ti fa felice.")}</p><div className="card-bottom"><span className="occasion-chip"><CalendarDays size={13} />{formatDate(list.date)}</span><span className="wish-count"><Heart size={13} />{plural(list.giftCount, t("desiderio"), t("desideri"))}</span></div></div><span className="cover-arrow"><ArrowUpRight size={25} /></span></Link>)}</div>
    {visible.length === 0 && <div className="empty-state">{search.trim() ? <Search size={30} /> : friends ? <Users size={30} strokeWidth={1.4} /> : <Gift size={30} strokeWidth={1.4} />}<h2>{search.trim() ? t("Non l’abbiamo trovata") : friends ? t("I desideri avvicinano") : tab === "archived" ? t("I tuoi ricordi, presto qui") : t("La prima lista parla di te")}</h2><p>{search.trim() ? t("Prova con un altro nome o torna a tutte le liste.") : friends ? t("Le liste dei tuoi amici arriveranno qui quando accetti un invito.") : tab === "archived" ? t("Le occasioni passate hanno ancora qualcosa da raccontare.") : t("Un compleanno, una nuova casa. O qualcosa che ami, senza un motivo particolare.")}</p>{search.trim() ? <button className="button secondary" onClick={() => setSearch("")}><X size={16} />{t("Cancella ricerca")}</button> : onCreate && tab === "active" && <button className="button secondary" onClick={create}>{t("Inizia con un desiderio") + " "}<ArrowRight size={16} /></button>}</div>}
    <div className="collection-bottom"><SurpriseSeal compact />{onCreate && visible.length > 0 && tab === "active" && <button className="add-occasion" onClick={create}><span><Plus size={20} /></span><div>{t("La prossima occasione")}<small>{t("Un altro motivo per desiderare.")}</small></div><ArrowUpRight size={18} /></button>}</div>
  </>;
}
