import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/translate";
import { getCurrentUser } from "@/lib/demo-actor";

/**
 * Personal calendar subscription links.
 *
 * The full system serves an .ics feed from `/api/calendar/<token>.ics`, which a
 * calendar application polls. A static demo has no such endpoint, so the token
 * is still issued and shown — the flow is demonstrable — and the timetable can
 * be downloaded as a one-off .ics file instead (see lib/calendar/ics.ts).
 */

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function feedUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/api/calendar/${token}.ics`;
}

export async function getCalendarFeedUrl(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error(translate("errors.accessDenied"));

  let token = user.calendarToken;
  if (!token) {
    token = randomToken();
    await prisma.user.update({ where: { id: user.id }, data: { calendarToken: token } });
  }

  return feedUrl(token);
}

/** Issues a new token, so any previously shared link stops working. */
export async function resetCalendarToken(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error(translate("errors.accessDenied"));

  const token = randomToken();
  await prisma.user.update({ where: { id: user.id }, data: { calendarToken: token } });
  return feedUrl(token);
}
