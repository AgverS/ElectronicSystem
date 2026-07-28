import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBlockToken } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Неверная ссылка", { status: 400 });
  }

  const userId = verifyBlockToken(token);
  if (!userId) {
    return new NextResponse("Ссылка недействительна или устарела", { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, reportBlocked: true },
  });

  if (!user) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  if (user.reportBlocked) {
    return new NextResponse(
      `✅ ${user.name} уже заблокирован для отправки отчётов.`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { reportBlocked: true },
  });

  return new NextResponse(
    `✅ ${user.name} заблокирован — отчёты об ошибках от него больше не принимаются.`,
    { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
