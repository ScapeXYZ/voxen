"use client";

import { useEffect } from "react";

/** Adds one-shot, viewport-aware entry states without affecting page behavior. */
export function LandingMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-landing-reveal], .home > section:not(.home-hero):not(.network-strip)",
      ),
    );
    const heroElements = elements.filter((element) =>
      element.closest(".home-hero"),
    );

    document.documentElement.classList.add("landing-motion-ready");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        heroElements.forEach((element) => element.classList.add("is-revealed"));
      });
    });

    const supportingElements = elements.filter(
      (element) => !element.closest(".home-hero"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    supportingElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("landing-motion-ready");
    };
  }, []);

  return null;
}
