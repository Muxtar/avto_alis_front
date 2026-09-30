"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { translations, Locale, TranslationKey } from "./translations";
import { setDomDictionary, translateString, type Dict } from "./domTranslate";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  /** AZ mənbə mətnini aktiv dilə çevirir (DOM-dan kənar yerlər üçün: title, clipboard və s.). */
  tr: (azText: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const isLocale = (v: unknown): v is Locale => v === "az" || v === "ru" || v === "en";

// Lüğətlər yalnız lazım olanda yüklənir (AZ default-dur, əlavə yük yoxdur).
const loaders: Record<Exclude<Locale, "az">, () => Promise<{ default: Dict }>> = {
  ru: () => import("./i18n/ru.json"),
  en: () => import("./i18n/en.json"),
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default: Azərbaycan dili. Seçim localStorage-da saxlanılır.
  const [locale, setLocaleState] = useState<Locale>("az");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("locale");
      if (isLocale(saved)) setLocaleState(saved);
    } catch {}
  }, []);

  // Komponentlərdə birbaşa yazılmış AZ mətnlərini ekranda aktiv dilə çevir.
  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale === "az") { setDomDictionary(null); return; }
    let cancelled = false;
    loaders[locale]().then((m) => { if (!cancelled) setDomDictionary(m.default); });
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try { localStorage.setItem("locale", newLocale); } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key],
    [locale]
  );

  const tr = useCallback((s: string) => (locale === "az" ? s : translateString(s)), [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, tr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
