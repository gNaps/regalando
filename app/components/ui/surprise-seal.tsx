"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useState } from "react";
import { ArrowUpRight, EyeOff, Users } from "lucide-react";
import { Dialog } from "./dialog";
import { GiftMark } from "./gift-mark";

export function SurpriseSeal({ compact = false, ownerName }: { compact?: boolean; ownerName?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <>
    <button className={`surprise-seal ${compact ? "compact" : ""}`} aria-haspopup="dialog" onClick={event => { event.currentTarget.focus({ preventScroll: true }); setOpen(true); }}>
      <span className="seal-medallion"><EyeOff size={19} /></span><span className="seal-copy"><strong>{ownerName ? t("Una sorpresa per {0}", { "0": ownerName }) : t("Sorpresa protetta")}</strong><span>{compact ? t("Scopri come funziona") : t("Le scelte degli amici restano un segreto.")}</span></span><ArrowUpRight className="seal-arrow" size={15} />
    </button>
    {open && <Dialog title={t("La sorpresa rimane tra amici")} subtitle={t("Tu scegli i desideri. Il resto lo scoprirai al momento giusto.")} onClose={() => setOpen(false)}><div className="surprise-explanation"><div className="explanation-seal"><GiftMark /></div><div><EyeOff size={20} /><p><strong>{t("Chi crea la lista vede i desideri.")}</strong><span>{t("Le prenotazioni e i nomi di chi sceglie un regalo rimangono nascosti.")}</span></p></div><div><Users size={20} /><p><strong>{t("Gli amici si organizzano tra loro.")}</strong><span>{t("Vedono chi ha prenotato cosa, così ogni regalo viene scelto una volta sola.")}</span></p></div><button className="button primary full-width" onClick={() => setOpen(false)}>{t("Perfetto, teniamo la sorpresa")}</button></div></Dialog>}
  </>;
}
