import { prisma } from "@/lib/prisma";

export async function getCurrentSemesterId(): Promise<string | null> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const byDate = await prisma.semester.findFirst({
    where: { startDate: { lte: today }, endDate: { gte: today } },
    orderBy: [{ year: "desc" }, { number: "desc" }],
  });
  if (byDate) return byDate.id;

  const latest = await prisma.semester.findFirst({
    orderBy: [{ year: "desc" }, { number: "desc" }],
  });
  return latest?.id ?? null;
}
