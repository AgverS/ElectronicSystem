"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconInfoCircle } from "@tabler/icons-react";

export function MetaButton({ meta }: { meta: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Подробности"
      >
        <IconInfoCircle size={13} />
        Детали
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Подробности события</DialogTitle>
          </DialogHeader>
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
