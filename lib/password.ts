// Shared password policy — used by the client (live checklist) and the
// server (enforced on first-login password creation in lib/auth.ts).
//
// Rules:
//  - at least 8 characters
//  - contains a lowercase Latin letter
//  - contains an uppercase Latin letter
//  - only Latin letters, digits and symbols (printable ASCII, no spaces,
//    no Cyrillic or other non-Latin letters)

const PRINTABLE_ASCII = /^[\x21-\x7E]+$/;

export interface PasswordRule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: "Не менее 8 символов",
    test: (pw) => pw.length >= 8,
  },
  {
    id: "lower",
    label: "Строчная латинская буква (a–z)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    id: "upper",
    label: "Заглавная латинская буква (A–Z)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "charset",
    label: "Только латиница, цифры и символы",
    test: (pw) => pw.length > 0 && PRINTABLE_ASCII.test(pw),
  },
];

/** Returns true when the password satisfies every rule. */
export function isPasswordValid(pw: string): boolean {
  return passwordRules.every((rule) => rule.test(pw));
}

/**
 * Returns the first failing rule's message, or null when the password is
 * valid. Used for the authoritative server-side check.
 */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Пароль должен содержать не менее 8 символов";
  if (!PRINTABLE_ASCII.test(pw))
    return "Пароль может содержать только латинские буквы, цифры и символы";
  if (!/[a-z]/.test(pw)) return "Пароль должен содержать строчную латинскую букву";
  if (!/[A-Z]/.test(pw)) return "Пароль должен содержать заглавную латинскую букву";
  return null;
}
