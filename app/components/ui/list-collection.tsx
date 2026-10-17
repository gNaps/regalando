"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Gift, Heart, Plus, Search, Users, X } from "lucide-react";
import { plural, type Cover } from "@/lib/domain";
import { CoverArt } from "./artwork";
import { SurpriseSeal } from "./surprise-seal";

export type ListSummary = { id: string; title: string; description: string; date?: string; cover: Cover; archived: boolean; giftCount: number; imageUrl?: string | null; owner?: string };

export function ListCollection({ lists, basePath, friends = false, onCreate }: { lists: ListSummary[]; basePath: string; friends?: boolean; onCreate?: () => void }) {
  const { t, locale, formatDate } = useI18n();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const matchingStatus = lists.filter(list => list.archived === (tab === "archived"));
  const visible = matchingStatus.filter(list => `${list.title} ${list.description} ${list.owner ?? ""}`.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const activeCount = lists.filter(list => !list.archived).length;
  function create(event: MouseEvent<HTMLButtonElement>) { event.currentTarget.focus({ preventScroll: true }); onCreate?.(); }
  const giftCount = lists.filter(list => !list.archived).reduce((total, list) => total + list.giftCount, 0);
  return <div className={`list-collection ${friends ? "friends-collection" : "owned-collection"}`}>
    <section className="collection-intro" aria-labelledby="collection-title">
      <div>
        <span className="eyebrow">{friends ? t("PENSIERI CHE LASCIANO IL SEGNO") : t("IL TUO SPAZIO, I TUOI DESIDERI")}</span>
        <h1 id="collection-title">{friends ? t("Liste degli") : t("Le mie")} <em>{friends ? t("amici.") : t("liste.")}</em></h1>
        <p>{friends ? t("Il regalo giusto comincia da chi ami.") : t("Un posto per ciò che ami. Un’idea per chi ti vuole bene.")}</p>
        <div className="collection-stats"><span>{plural(activeCount, friends ? t("lista condivisa") : t("lista attiva"), friends ? t("liste condivise") : t("liste attive"))}</span><span aria-hidden="true">/</span><span>{plural(giftCount, t("desiderio"), t("desideri"))}</span></div>
      </div>
      <div className="collection-intro-actions">
        {onCreate && <button className="button primary" onClick={create}><Plus size={18} aria-hidden="true" />{t("Crea una lista")}</button>}
        {friends ? <div className="friends-collection-note"><span className="seal-medallion"><Users size={20} aria-hidden="true" /></span><div><strong>{t("Un bel pensiero, insieme.")}</strong><p>{t("Scegli un desiderio e organizzati con gli altri invitati.")}</p></div></div> : <SurpriseSeal compact />}
      </div>
    </section>
    <div className="collection-section"><div className="tabs" role="group" aria-label={t("Stato delle liste")}><button className={tab === "active" ? "selected" : ""} onClick={() => setTab("active")} aria-pressed={tab === "active"}>{friends ? t("Condivise con te") : t("Le mie liste")}<span className="collection-tab-count" aria-hidden="true">{activeCount}</span></button><button className={tab === "archived" ? "selected" : ""} onClick={() => setTab("archived")} aria-pressed={tab === "archived"}>{t("Archiviate")}<span className="collection-tab-count" aria-hidden="true">{lists.length - activeCount}</span></button></div><label className="list-search"><Search size={17} /><input type="search" aria-label={t("Cerca una lista")} placeholder={t("Trova una lista")} value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    <div className="list-grid">{visible.map(list => <Link href={`${basePath}/${list.id}`} key={list.id} className={`list-card list-${list.cover}`}><div className="collection-card-art"><CoverArt cover={list.cover} imageUrl={list.imageUrl} /></div><div className="list-card-body"><span className="cover-label">{friends ? t("PER {0}", { "0": list.owner?.toLocaleUpperCase(locale) ?? t("UN AMICO") }) : tab === "archived" ? t("UN BEL RICORDO") : t("LA TUA WISHLIST")}</span><h2>{list.title}</h2><p>{list.description || t("Un piccolo spazio per ciò che ti fa felice.")}</p><div className="card-bottom"><span className="occasion-chip"><CalendarDays size={13} />{formatDate(list.date)}</span><span className="wish-count"><Heart size={13} />{plural(list.giftCount, t("desiderio"), t("desideri"))}</span></div></div><span className="cover-arrow"><ArrowUpRight size={25} /></span></Link>)}{!friends && onCreate && visible.length > 0 && tab === "active" && !search.trim() && <button className="collection-create-card" onClick={create}><span className="collection-create-icon"><Plus size={25} aria-hidden="true" /></span><strong>{t("Un nuovo desiderio inizia qui")}</strong><span>{t("Un compleanno, un progetto, o semplicemente tu.")}</span><span className="text-link">{t("Crea una lista")}<ArrowUpRight size={16} aria-hidden="true" /></span></button>}</div>
    {visible.length === 0 && <div className="empty-state">{search.trim() ? <Search size={30} /> : friends ? <Users size={30} strokeWidth={1.4} /> : <Gift size={30} strokeWidth={1.4} />}<h2>{search.trim() ? t("Non l’abbiamo trovata") : friends ? (tab === "archived" ? t("Nessuna lista archiviata") : t("I desideri avvicinano")) : tab === "archived" ? t("I tuoi ricordi, presto qui") : t("La prima lista parla di te")}</h2><p>{search.trim() ? t("Prova con un altro nome o torna a tutte le liste.") : friends ? (tab === "archived" ? t("Le liste archiviate dai tuoi amici appariranno qui.") : t("Le liste dei tuoi amici arriveranno qui quando accetti un invito.")) : tab === "archived" ? t("Le occasioni passate hanno ancora qualcosa da raccontare.") : t("Un compleanno, una nuova casa. O qualcosa che ami, senza un motivo particolare.")}</p>{search.trim() ? <button className="button secondary" onClick={() => setSearch("")}><X size={16} />{t("Cancella ricerca")}</button> : onCreate && tab === "active" && <button className="button secondary" onClick={create}>{t("Inizia con un desiderio") + " "}<ArrowRight size={16} /></button>}</div>}

  </div>;
}
