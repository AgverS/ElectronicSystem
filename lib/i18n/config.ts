/**
 * Language configuration.
 *
 * Adding a language is one file: create `locales/<code>.json` with the same
 * keys as `locales/en.ts`, then add an entry here. Nothing else needs to change
 * — the switcher, the loader and the document language all read from this list.
 */

export const LOCALES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_CODES = LOCALES.map((l) => l.code) as Locale[];

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALE_CODES as string[]).includes(value);
}

/** Pick the best supported language for a visitor arriving for the first time. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
