"use client";

import { IconDownload } from "@tabler/icons-react";
import { translate } from "@/lib/i18n/translate";
import { Button } from "@/components/ui/button";

interface ResultRow {
  subject: string;
  totalLessons: number;
  absences: number;
  avg: string | null;
}

interface ResultsExportButtonProps {
  rows: ResultRow[];
  semesterLabel: string;
  studentName: string;
}

export function ResultsExportButton({ rows, semesterLabel, studentName }: ResultsExportButtonProps) {
  async function handleExport() {
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    wb.creator = translate("app.name");
    const ws = wb.addWorksheet(translate("nav.results"));

    const COL_COUNT = 4;
    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const medium = { style: "medium" as const, color: { argb: "FF9CA3AF" } };

    // Title
    ws.addRow([translate("ui.semesterResults") + studentName]);
    ws.mergeCells(1, 1, 1, COL_COUNT);
    const t = ws.getRow(1).getCell(1);
    t.font = { bold: true, size: 12 };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 26;

    // Subtitle
    ws.addRow([semesterLabel]);
    ws.mergeCells(2, 1, 2, COL_COUNT);
    const s = ws.getRow(2).getCell(1);
    s.font = { size: 10, italic: true };
    s.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 16;

    // Header
    ws.addRow([translate("term.subject"), translate("term.lessons"), translate("term.absences"), translate("ui.averageGrade")]);
    const headerRow = ws.getRow(3);
    headerRow.eachCell((cell, colNum) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle" };
      cell.border = { bottom: medium, right: thin, top: thin, left: thin };
    });
    headerRow.height = 20;

    // Data rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      ws.addRow([r.subject, r.totalLessons, r.absences || "", r.avg ?? "-"]);
      const exRow = ws.getRow(i + 4);

      exRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = { size: 10 };
        cell.border = { bottom: thin, right: thin };
        cell.alignment = { horizontal: colNum === 1 ? "left" : "center", vertical: "middle" };
      });
      exRow.height = 18;
    }

    // Column widths
    ws.getColumn(1).width = 38;
    ws.getColumn(2).width = 10;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 16;

    ws.views = [{ state: "frozen", ySplit: 3 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = translate("ui.results") + semesterLabel.replace(/[^0-9A-Za-zА-Яа-я]+/g, "_") + ".xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={rows.length === 0}>
      <IconDownload size={16} />
      {translate("ui.exportToExcel")}
    </Button>
  );
}
