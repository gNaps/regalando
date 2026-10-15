"use client";

import { useI18n } from "@/app/providers/LocaleProvider";
import { type Cover, type Illustration } from "@/lib/domain";
import Image from "next/image";

const coverArtwork: Record<Cover, string> = {
  plum: "/images/cover-black.webp",
  sage: "/images/cover-silver.webp",
  sand: "/images/cover-gold.webp",
};

const productArtwork: Record<Illustration, string> = {
  vase: "/images/category-design.webp",
  phone: "/images/category-tech.webp",
  controller: "/images/category-gaming.webp",
  headphones: "/images/category-music.webp",
  art: "/images/category-art.webp",
  books: "/images/category-art.webp",
  suitcase: "/images/category-travel.webp",
  bag: "/images/category-style.webp",
  perfume: "/images/category-beauty.webp",
  experience: "/images/category-experiences.webp",
  gift: "/images/category-other.webp",
};

export function DesireSculpture() {
  const { t } = useI18n();
  return <div className="desire-sculpture" aria-hidden="true"><div className="sculpture-orbit" /><Image src="/images/desire-ribbon.png" alt="" fill sizes="(max-width: 760px) 75vw, 550px" loading="eager" fetchPriority="high" className="ribbon-image" /><span className="sculpture-caption">{t("IL BELLO È NELL’ATTESA.")}</span></div>;
}

export function CoverArt({ cover, preview = false }: { cover: Cover; preview?: boolean }) {
  return <div className={`cover-art cover-${cover}`} aria-hidden="true">
    <Image src={coverArtwork[cover]} alt="" fill sizes={preview ? "85px" : "(max-width: 760px) 96px, 200px"} loading={preview ? "lazy" : "eager"} />
  </div>;
}

export function ProductArt({ kind }: { kind: Illustration }) {
  return <div className={`product-art product-${kind}`} aria-hidden="true">
    <Image src={productArtwork[kind]} alt="" fill sizes="96px" />
  </div>;
}
