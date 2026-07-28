import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterKey, type PushFilter } from "@/lib/push-utils";

interface SubscribeBody {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  filter: { groupId?: string; teacherId?: string; room?: string };
}

export async function POST(req: NextRequest) {
  const body: SubscribeBody = await req.json();
  const { endpoint, keys, filter } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const f = filter.groupId
    ? ({ groupId: filter.groupId } satisfies PushFilter)
    : filter.teacherId
      ? ({ teacherId: filter.teacherId } satisfies PushFilter)
      : filter.room
        ? ({ room: filter.room } satisfies PushFilter)
        : null;

  if (!f) {
    return NextResponse.json({ error: "No filter provided" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint_filterKey: { endpoint, filterKey: filterKey(f) } },
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      filterKey: filterKey(f),
    },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body: { endpoint: string; filterKey?: string } = await req.json();

  if (body.filterKey) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint, filterKey: body.filterKey },
    });
  } else {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: body.endpoint },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const endpoint = sp.get("endpoint");
  const fKey = sp.get("filterKey");

  if (!endpoint || !fKey) {
    return NextResponse.json({ subscribed: false });
  }

  const sub = await prisma.pushSubscription.findUnique({
    where: { endpoint_filterKey: { endpoint, filterKey: fKey } },
    select: { id: true },
  });

  return NextResponse.json({ subscribed: !!sub });
}
