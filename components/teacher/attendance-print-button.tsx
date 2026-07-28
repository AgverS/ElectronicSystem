"use client";

import { Button } from "@/components/ui/button";
import { IconPrinter } from "@tabler/icons-react";

export function AttendancePrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <IconPrinter size={16} className="mr-1.5" />
      Печать
    </Button>
  );
}
