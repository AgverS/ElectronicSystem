/**
 * Translation outside React.
 *
 * Deliberately not a client module: helpers and mutation functions that are
 * evaluated during the static build as well as in the browser import from here,
 * and a `"use client"` boundary would make that a build error.
 *
 * The provider keeps `activeMessages` in step with the chosen language. Inside
 * components prefer the `useT()` hook — it re-renders on a language change on
 * its own.
 */

import en from "./locales/en";

export type Messages = Record<string, string>;

let activeMessages: Messages = en;

/** Called by the provider whenever the language changes. */
export function setActiveMessages(messages: Messages) {
  activeMessages = messages;
}

export function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

export function translate(key: string, params?: Record<string, string | number>) {
  return interpolate(activeMessages[key] ?? en[key] ?? key, params);
}
