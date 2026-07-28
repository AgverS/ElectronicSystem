import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { filterKey } from "@/lib/push-utils";
import type { PushFilter } from "@/lib/push-utils";

export type { PushFilter } from "@/lib/push-utils";
export { filterKey } from "@/lib/push-utils";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function sendPushNotifications(
  filter: PushFilter,
  payload: PushPayload,
  { delayMs = 0 }: { delayMs?: number } = {},
) {
  if (delayMs > 0) {
    setTimeout(() => sendPushNotifications(filter, payload), delayMs);
    return;
  }
  const key = filterKey(filter);
  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

  const subs = await prisma.pushSubscription.findMany({
    where: {
      filterKey: key,
      OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: cutoff } }],
    },
  });

  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ),
    ),
  );

  const now = new Date();
  const deadEndpoints: string[] = [];

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const status = (r.reason as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        deadEndpoints.push(subs[i].endpoint);
      } else {
        console.error(
          `[push] send failed (status ${status ?? "?"}) for ${key}:`,
          (r.reason as { body?: string })?.body ?? r.reason,
        );
      }
    }
  });

  await Promise.all([
    prisma.pushSubscription.updateMany({
      where: { filterKey: key, lastNotifiedAt: { lt: cutoff } },
      data: { lastNotifiedAt: now },
    }),
    prisma.pushSubscription.updateMany({
      where: { filterKey: key, lastNotifiedAt: null },
      data: { lastNotifiedAt: now },
    }),
    deadEndpoints.length > 0
      ? prisma.pushSubscription.deleteMany({
          where: { endpoint: { in: deadEndpoints } },
        })
      : Promise.resolve(),
  ]);
}
