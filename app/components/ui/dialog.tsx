"use client";

import { useI18n } from "@/app/providers/LocaleProvider";

import { useEffect, useRef, useId, type ReactNode } from "react";
import { X } from "lucide-react";

export function Dialog({ title, subtitle, onClose, children, dirty = false, className = "", eyebrow = "REGALANDO" }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; dirty?: boolean; className?: string; eyebrow?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const unmounting = useRef(false);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    unmounting.current = false;
    dialog?.showModal();
    // A field marked data-autofocus wins over the first input, so optional helpers can sit above the main field.
    (dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? dialog?.querySelector<HTMLElement>('input:not([type="hidden"]), textarea, select'))?.focus({ preventScroll: true });
    return () => { unmounting.current = true; dialog?.close(); previousFocus?.focus({ preventScroll: true }); };
  }, []);
  function confirmClose() { return !dirty || window.confirm(t("Vuoi chiudere e perdere le modifiche?")); }
  function close() { if (confirmClose()) onClose(); }
  // Il browser può chiudere il dialog anche se `cancel` è stato annullato (es. Esc ripetuto):
  // in quel caso si riallinea lo stato React, oppure si riapre se l'utente vuole restare.
  function handleNativeClose() {
    const dialog = ref.current;
    // StrictMode replays the effect: cleanup closes the dialog, then setup reopens
    // it before the queued native close event arrives. Ignore that stale event.
    if (unmounting.current || !dialog || dialog.open) return;
    if (confirmClose()) onClose(); else dialog.showModal();
  }
  return <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }} onClose={handleNativeClose} onClick={event => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
    <div className="dialog-header"><div><span className="eyebrow">{eyebrow}</span><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={close} aria-label={t("Chiudi")}><X size={20} /></button></div>
    {children}
  </dialog>;
}
