"use client";

import { listBackupsAction, getBackupSettingsAction } from "@/lib/actions/backups";
import { BackupsView } from "@/components/admin/backups-view";
import { PageLoading } from "@/components/ui/page-state";
import { useDemoUser } from "@/lib/demo-session";
import { useDemoData } from "@/lib/use-demo-data";

export default function BackupsPage() {
  const user = useDemoUser();

  const { data, loading } = useDemoData(
    ["admin-backups", user?.id],
    async () => {
      const [backups, settings] = await Promise.all([
        listBackupsAction(),
        getBackupSettingsAction(),
      ]);
      return { backups, settings };
    },
    { enabled: !!user },
  );

  if (loading || !data) return <PageLoading />;

  return (
    <div className="space-y-4">
      <BackupsView initialBackups={data.backups} initialSettings={data.settings} />
    </div>
  );
}
