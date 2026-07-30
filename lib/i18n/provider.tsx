"use client";

import * as React from "react";
import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from "./config";
import en from "./locales/en";
import { STORAGE_KEYS } from "@/lib/demo-db/storage";
import { interpolate, setActiveMessages, type Messages } from "./translate";

const STORAGE_KEY = STORAGE_KEYS.locale;

export type { Messages };

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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = React.useState<Messages>(en);

  const applyLocale = React.useCallback(async (next: Locale) => {
    let nextMessages: Messages = en;
    if (next !== "en") {
      try {
        const loaded = await loaders[next]();
        // Fall back to English for any key a catalog has not translated yet.
        nextMessages = { ...en, ...loaded.default };
      } catch {
        nextMessages = en;
      }
    }
    // Keep the non-React translator in step for helpers outside components.
    setActiveMessages(nextMessages);
    setMessages(nextMessages);
    setLocaleState(next);
    document.documentElement.lang = next;
  }, []);

  // Resolve the initial language once, on the client: the saved choice and the
  // browser's preferences are only readable here, not during prerendering.
  React.useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial = isLocale(saved) ? saved : detectLocale(navigator.languages ?? []);
    if (initial === DEFAULT_LOCALE) {
      document.documentElement.lang = DEFAULT_LOCALE;
      return;
    }
    // Not a synchronous state update: applyLocale awaits the catalog's dynamic
    // import before it touches state. The lint rule cannot see across the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void applyLocale(initial);
  }, [applyLocale]);

  const setLocale = React.useCallback(
    (next: Locale) => {
      window.localStorage.setItem(STORAGE_KEY, next);
      void applyLocale(next);
    },
    [applyLocale],
  );

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) =>
      interpolate(messages[key] ?? en[key] ?? key, params),
    [messages],
  );

  const value = React.useMemo(
    () => ({ locale, setLocale, t, intlLocale: INTL_TAGS[locale] }),
    [locale, setLocale, t],
  );

  return (
    <I18nContext.Provider value={value}>
      {/*
        Remounting on a language change lets components use the non-reactive
        `translate()` as well as the `useT()` hook and be correct either way.
        Switching language is a deliberate, rare action, so paying a remount for
        it is a good trade against threading a hook through every component.
      */}
      <React.Fragment key={locale}>{children}</React.Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return React.useContext(I18nContext);
}

/** Shorthand for the common case: `const t = useT()`. */
export function useT() {
  return React.useContext(I18nContext).t;
}
