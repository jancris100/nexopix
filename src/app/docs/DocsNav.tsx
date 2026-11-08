"use client";

import { useEffect, useRef, useState } from "react";

/** The index of the documentation, marking the section being read as the page scrolls. */
export default function DocsNav({ sections, label }: { sections: { id: string; label: string }[]; label: string }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const list = useRef<HTMLOListElement>(null);

  // On a phone the index is a sideways bar: keep the marked section in sight without moving the page.
  useEffect(() => {
    const bar = list.current;
    const link = bar?.querySelector<HTMLElement>(".is-active");
    if (!bar || !link || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: link.offsetLeft - bar.clientWidth / 2 + link.offsetWidth / 2, behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const targets = sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => node !== null);
    // The section that crossed the line just under the top bar is the one being read.
    const pick = () => {
      const line = window.innerWidth <= 900 ? 150 : 120;
      let current = targets[0]?.id ?? "";
      for (const target of targets) if (target.getBoundingClientRect().top <= line) current = target.id;
      // At the very end of the page the last section counts, even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = targets[targets.length - 1]?.id ?? current;
      setActive(current);
    };
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (sections.some((section) => section.id === id)) setActive(id);
    };
    fromHash();
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
      window.removeEventListener("hashchange", fromHash);
    };
  }, [sections]);

  return (
    <nav className="docs__nav" aria-label={label}>
      <p>{label}</p>
      <ol ref={list}>
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className={active === section.id ? "is-active" : undefined} aria-current={active === section.id ? "location" : undefined}>
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
