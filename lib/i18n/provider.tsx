"use client";

import * as React from "react";
import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from "./config";
import en from "./locales/en";

const STORAGE_KEY = "electronic-system-demo-locale";

export type Messages = Record<string, string>;

/** Catalogs other than English load on demand, so the first paint stays small. */
const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Messages }>> = {
  fr: () => import("./locales/fr.json"),
  es: () => import("./locales/es.json"),
  de: () => import("./locales/de.json"),
  ru: () => import("./locales/ru.json"),
};

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Locale tag for Intl formatting, e.g. "fr-FR". */
  intlLocale: string;
}

const INTL_TAGS: Record<Locale, string> = {
  en: "en-GB",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  ru: "ru-RU",
};

const I18nContext = React.createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => en[key] ?? key,
  intlLocale: INTL_TAGS[DEFAULT_LOCALE],
});

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = React.useState<Messages>(en);

  // Resolve the initial language once, on the client.
  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial = isLocale(saved) ? saved : detectLocale(navigator.languages ?? []);
    if (initial !== DEFAULT_LOCALE) void applyLocale(initial);
    else document.documentElement.lang = DEFAULT_LOCALE;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyLocale(next: Locale) {
    if (next === "en") {
      setMessages(en);
    } else {
      try {
        const loaded = await loaders[next]();
        // Fall back to English for any key a catalog has not translated yet.
        setMessages({ ...en, ...loaded.default });
      } catch {
        setMessages(en);
      }
    }
    setLocaleState(next);
    document.documentElement.lang = next;
  }

  const setLocale = React.useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    void applyLocale(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) =>
      interpolate(messages[key] ?? en[key] ?? key, params),
    [messages],
  );

  const value = React.useMemo(
    () => ({ locale, setLocale, t, intlLocale: INTL_TAGS[locale] }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return React.useContext(I18nContext);
}

/** Shorthand for the common case: `const t = useT()`. */
export function useT() {
  return React.useContext(I18nContext).t;
}
