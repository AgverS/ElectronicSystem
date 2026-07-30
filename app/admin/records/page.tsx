"use client";

import { RecordsView } from "@/components/admin/records-view";
import { useT } from "@/lib/i18n/provider";

export default function AdminRecordsPage() {
  const t = useT();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">{t("nav.records")}</h1>
      <RecordsView />
    </div>
  );
}
