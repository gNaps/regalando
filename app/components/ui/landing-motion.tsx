"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const landing = document.querySelector<HTMLElement>(".landing-page");
    if (!landing || !("IntersectionObserver" in window)) return;

    const elements = Array.from(landing.querySelectorAll<HTMLElement>("[data-reveal]"));
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;

    const reveal = (element: HTMLElement) => {
      element.dataset.revealState = "visible";
      observer?.unobserve(element);
    };

    const configure = () => {
      observer?.disconnect();
      if (motionPreference.matches) {
        elements.forEach(reveal);
        return;
      }

      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) reveal(entry.target as HTMLElement);
        });
      }, { rootMargin: "0px 0px -32px 0px", threshold: 0 });

      elements.forEach(element => {
        // Keep the first screen visible; only prepare content below the fold.
        if (element.dataset.revealState === "visible" || element.getBoundingClientRect().top < window.innerHeight) {
          reveal(element);
        } else {
          element.dataset.revealState = "pending";
          observer?.observe(element);
        }
      });
    };

    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("[data-reveal]");
      if (element) reveal(element);
    };

    configure();
    motionPreference.addEventListener("change", configure);
    landing.addEventListener("focusin", onFocus);

    return () => {
      observer?.disconnect();
      motionPreference.removeEventListener("change", configure);
      landing.removeEventListener("focusin", onFocus);
      elements.forEach(element => delete element.dataset.revealState);
    };
  }, []);

  return null;
}
