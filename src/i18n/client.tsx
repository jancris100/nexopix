"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { setLocale } from "./actions";
import { dictionaryFor, type Dictionary } from "./dictionaries";
import { LOCALES, type Locale } from "./locale";

const I18n = createContext<{ locale: Locale; t: Dictionary }>({ locale: "en", t: dictionaryFor("en") });

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <I18n.Provider value={{ locale, t: dictionaryFor(locale) }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

/** ES and EN side by side: the choice is saved and the page is drawn again in that language. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [busy, start] = useTransition();
  const choose = (next: Locale) => {
    if (next === locale) return;
    start(async () => {
      await setLocale(next);
      router.refresh();
    });
  };
  return (
    <div className={`lang${className ? ` ${className}` : ""}`} role="group" aria-label={t.switchLanguage}>
      {LOCALES.map((code) => (
        <button key={code} type="button" lang={code} aria-pressed={code === locale} className={code === locale ? "is-on" : ""} disabled={busy} onClick={() => choose(code)}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
