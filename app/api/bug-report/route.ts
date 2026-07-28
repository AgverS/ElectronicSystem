import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { sendBugReport } from "@/lib/telegram";

const COOLDOWN_SECONDS = 180;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, username: true, role: true, reportBlocked: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.reportBlocked) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  const cdKey = `bug-report:cooldown:${user.id}`;
  const ttl = await redis.ttl(cdKey);
  if (ttl > 0) {
    return NextResponse.json({ error: "Cooldown", retryAfter: ttl }, { status: 429 });
  }

  const body = await req.json();
  const message: string = (body?.message ?? "").trim();

  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  await sendBugReport(user, message);
  await redis.set(cdKey, "1", "EX", COOLDOWN_SECONDS);

  return NextResponse.json({ ok: true });
}
