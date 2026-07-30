import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/translate";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { IconUsersGroup } from "@tabler/icons-react";
import { formatCourse } from "@/lib/group-course";

export async function PublicGroupSelector() {
  const specialties = await prisma.specialty.findMany({
    include: {
      groups: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Groups that might not have a specialty (though they should)
  const orphanGroups = await prisma.group.findMany({
    where: { specialtyId: null },
    orderBy: { name: "asc" },
  });

  if (specialties.length === 0 && orphanGroups.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {translate("ui.noGroupsFound")}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {specialties.map((specialty) => (
        <div key={specialty.id} className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <h2 className="text-lg font-semibold text-foreground">
              {specialty.name}
            </h2>
            {specialty.abbreviation && (
              <span className="text-xs text-muted-foreground uppercase">
                {specialty.abbreviation}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {specialty.groups.map((group) => (
              <Link
                key={group.id}
                href={`/schedule?group=${group.id}`}
                className="group transition-all"
              >
                <Card className="h-full hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                    <IconUsersGroup size={20} className="mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm sm:text-base">
                      {group.name}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground mt-1">
                      {formatCourse(group.name)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {orphanGroups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <h2 className="text-lg font-semibold text-foreground">
              {translate("ui.noDepartment")}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {orphanGroups.map((group) => (
              <Link
                key={group.id}
                href={`/schedule?group=${group.id}`}
                className="group transition-all"
              >
                <Card className="h-full hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <CardContent className="flex flex-col items-center justify-center p-4 text-center">
                    <IconUsersGroup size={20} className="mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-medium text-sm sm:text-base">
                      {group.name}
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground mt-1">
                      {formatCourse(group.name)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
