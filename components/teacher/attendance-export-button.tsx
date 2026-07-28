"use client";

import { IconDownload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface AttendanceExportButtonProps {
  fileName: string;
  title: string;
  header: (string | number)[];
  rows: (string | number)[][];
  disabled?: boolean;
}

export function AttendanceExportButton({
  fileName,
  title,
  header,
  rows,
  disabled,
}: AttendanceExportButtonProps) {
  async function handleExport() {
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    wb.creator = "Электронный журнал";
    const ws = wb.addWorksheet("Ведомость пропусков");

    const colCount = header.length;
    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const medium = { style: "medium" as const, color: { argb: "FF9CA3AF" } };

    // Title
    ws.addRow([title]);
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getRow(1).getCell(1);
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 26;

    // Header
    ws.addRow(header);
    const headerRow = ws.getRow(2);
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: medium, right: thin, top: thin, left: thin };
    });
    headerRow.height = 20;

    // Data + totals
    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];
      const isTotals = rowData[1] === "ИТОГО";
      ws.addRow(rowData);
      const exRow = ws.getRow(i + 3);

      exRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = isTotals
          ? { bold: true, size: 10 }
          : { size: 10 };
        cell.border = { bottom: thin, right: thin };
        cell.alignment = {
          horizontal: colNum === 2 ? "left" : "center",
          vertical: "middle",
        };
      });

      if (isTotals) {
        exRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
          cell.border = { top: medium, bottom: thin, right: thin };
        });
        exRow.height = 20;
      } else {
        exRow.height = 17;
      }
    }

    // Column widths
    ws.getColumn(1).width = 5;
    ws.getColumn(2).width = 34;
    for (let c = 3; c < colCount; c++) ws.getColumn(c).width = 4.2;
    ws.getColumn(colCount).width = 8;

    ws.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={disabled}>
      <IconDownload size={16} />
      Экспорт Excel
    </Button>
  );
}
