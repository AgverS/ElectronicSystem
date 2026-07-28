"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Возвращает персональную ссылку на ICS-подписку, создавая токен при необходимости.
export async function getCalendarFeedUrl(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизовано");

  let token = user.calendarToken;
  if (!token) {
    token = randomBytes(24).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { calendarToken: token },
    });
  }

  return `${await baseUrl()}/api/calendar/${token}.ics`;
}

// Сбрасывает токен (старая ссылка перестаёт работать) и возвращает новую.
export async function resetCalendarToken(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Не авторизовано");

  const token = randomBytes(24).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { calendarToken: token },
  });
  return `${await baseUrl()}/api/calendar/${token}.ics`;
}
