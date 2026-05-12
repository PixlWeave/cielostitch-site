/**
 * CieloStitch — main.js
 *
 * Responsibilities:
 *  1. Animate feature cards into view as they enter the viewport
 *     (IntersectionObserver, falls back gracefully when unavailable).
 *  2. Stagger the animation so cards appear one-by-one.
 */

(function () {
  "use strict";

  /* -------------------------------------------------------
     1. Animate feature cards on scroll
  ------------------------------------------------------- */
  const STAGGER_MS = 80; // delay between consecutive cards

  function initCardAnimations() {
    const cards = Array.from(document.querySelectorAll(".feature-card[data-animate]"));

    if (!cards.length) return;

    // Honour prefers-reduced-motion — reveal everything immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cards.forEach(function (card) {
        card.classList.add("is-visible");
      });
      return;
    }

    if (!("IntersectionObserver" in window)) {
      // Fallback: just show all cards
      cards.forEach(function (card) {
        card.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          const card = entry.target;
          const index = cards.indexOf(card);
          const delay = index * STAGGER_MS;

          setTimeout(function () {
            card.classList.add("is-visible");
          }, delay);

          observer.unobserve(card);
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -48px 0px",
      }
    );

    cards.forEach(function (card) {
      observer.observe(card);
    });
  }

  /* -------------------------------------------------------
     2. Smooth active-link highlight in navigation
  ------------------------------------------------------- */
  function initNavActiveLinks() {
    const navLinks = document.querySelectorAll(".nav__links a:not(.btn)");
    const sections = Array.from(
      document.querySelectorAll("section[id], header[id]")
    );

    if (!sections.length || !navLinks.length) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach(function (link) {
            const href = link.getAttribute("href");
            if (href === "#" + id) {
              link.setAttribute("aria-current", "true");
              link.style.color = "var(--color-text)";
            } else {
              link.removeAttribute("aria-current");
              link.style.color = "";
            }
          });
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* -------------------------------------------------------
     3. Boot
  ------------------------------------------------------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initCardAnimations();
      initNavActiveLinks();
    });
  } else {
    initCardAnimations();
    initNavActiveLinks();
  }
})();
