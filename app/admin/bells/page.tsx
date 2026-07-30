import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/translate";
import { toISODate } from "@/lib/week";
import { BellPermanentEditor } from "@/components/admin/bell-permanent-editor";
import { BellOverridesManager } from "@/components/admin/bell-overrides-manager";

export default async function BellsPage() {
  const [bells, overrides] = await Promise.all([
    prisma.bellTime.findMany({
      orderBy: [{ dayGroup: "asc" }, { number: "asc" }],
    }),
    prisma.bellOverride.findMany({
      orderBy: { startDate: "asc" },
      include: { slots: { orderBy: { number: "asc" } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight">{translate("nav.bells")}</h1>
        <p className="text-sm text-muted-foreground">
          {translate("ui.theStandardTimetableByDayOfTheWeek")}
        </p>
      </div>

      <BellPermanentEditor
        initial={bells.map((b) => ({
          dayGroup: b.dayGroup,
          number: b.number,
          startTime: b.startTime,
          endTime: b.endTime,
        }))}
      />

      <BellOverridesManager
        overrides={overrides.map((o) => ({
          id: o.id,
          name: o.name,
          startDate: toISODate(o.startDate),
          endDate: toISODate(o.endDate),
          slots: o.slots.map((s) => ({
            number: s.number,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        }))}
      />
    </div>
  );
}
