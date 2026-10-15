"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import Link from "next/link";
import { GiftMark } from "./gift-mark";

export function Brand({ href = "/lists" }: { href?: string }) {
  const { t } = useI18n();
  return <Link className="brand" href={href} aria-label={href === "/" ? t("Regalando, homepage") : t("Regalando, le mie liste")}><span className="brand-mark"><GiftMark /></span><span>regalando<span className="brand-dot">.</span></span></Link>;
}
