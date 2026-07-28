"use client";

import { useState } from "react";
import { IconAward } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordAttachments } from "@/components/records/record-attachments";
import { cn } from "@/lib/utils";
import { RecordKind } from "@/lib/prisma-client";
import {
  RECORD_KIND_LABELS,
  RECORD_KIND_COLORS,
  formatRecordDate,
} from "@/lib/records";

export interface StudentRecordItem {
  id: string;
  kind: RecordKind;
  number: string;
  date: string;
  reason: string;
  attachments: { id: string; fileName: string; mimeType: string }[];
}

type KindFilter = "" | RecordKind;

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: "", label: "Все" },
  { value: RecordKind.REWARD, label: "Поощрения" },
  { value: RecordKind.PENALTY, label: "Взыскания" },
];

export function StudentRecordsList({ records }: { records: StudentRecordItem[] }) {
  const [kind, setKind] = useState<KindFilter>("");

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-20 text-center text-muted-foreground">
        <IconAward size={32} className="opacity-40" />
        <p>Поощрений и взысканий пока нет.</p>
      </div>
    );
  }

  const rewards = records.filter((r) => r.kind === RecordKind.REWARD).length;
  const penalties = records.filter((r) => r.kind === RecordKind.PENALTY).length;
  const visible = kind ? records.filter((r) => r.kind === kind) : records;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {KIND_FILTERS.map((f) => (
            <Button
              key={f.value || "all"}
              size="sm"
              variant={kind === f.value ? "secondary" : "ghost"}
              onClick={() => setKind(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("border-transparent", RECORD_KIND_COLORS.REWARD)}>
            {rewards} {RECORD_KIND_LABELS.REWARD.toLowerCase()}
          </Badge>
          <Badge className={cn("border-transparent", RECORD_KIND_COLORS.PENALTY)}>
            {penalties} {RECORD_KIND_LABELS.PENALTY.toLowerCase()}
          </Badge>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          Нет записей этого типа.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("border-transparent", RECORD_KIND_COLORS[r.kind])}>
                    {RECORD_KIND_LABELS[r.kind]}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    № {r.number}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatRecordDate(r.date)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.reason}</p>
              </div>
              <RecordAttachments attachments={r.attachments} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
