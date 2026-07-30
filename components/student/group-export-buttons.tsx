"use client";

import { IconDownload, IconPrinter } from "@tabler/icons-react";
import { translate } from "@/lib/i18n/translate";
import { Button } from "@/components/ui/button";

interface Student {
  id: string;
  name: string;
}

interface GroupExportButtonsProps {
  groupName: string;
  curatorName: string;
  students: Student[];
}

export function GroupExportButtons({ groupName, curatorName, students }: GroupExportButtonsProps) {
  async function handleExportExcel() {
    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    wb.creator = translate("app.name");
    const ws = wb.addWorksheet(translate("ui.groupList"));

    const COL_COUNT = 2;
    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const medium = { style: "medium" as const, color: { argb: "FF9CA3AF" } };

    // Title
    ws.addRow([`Список группы ${groupName}`]);
    ws.mergeCells(1, 1, 1, COL_COUNT);
    const t = ws.getRow(1).getCell(1);
    t.font = { bold: true, size: 14 };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Curator
    ws.addRow([`Куратор: ${curatorName || translate("ui.notAssigned")}`]);
    ws.mergeCells(2, 1, 2, COL_COUNT);
    const s = ws.getRow(2).getCell(1);
    s.font = { size: 11, italic: true };
    s.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 20;

    // Header
    ws.addRow(["№", translate("ui.fullName")]);
    const headerRow = ws.getRow(3);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: medium, right: thin, top: thin, left: thin };
    });
    headerRow.height = 24;

    // Data rows
    students.forEach((st, i) => {
      ws.addRow([i + 1, st.name]);
      const exRow = ws.getRow(i + 4);

      exRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      exRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

      exRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { size: 11 };
        cell.border = { bottom: thin, right: thin, left: thin };
      });
      exRow.height = 22;
    });

    // Column widths
    ws.getColumn(1).width = 8;
    ws.getColumn(2).width = 50;

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Список_группы_${groupName}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button size="sm" variant="outline" onClick={handlePrint}>
        <IconPrinter size={16} />
        {translate("common.print")}
      </Button>
      <Button size="sm" variant="outline" onClick={handleExportExcel}>
        <IconDownload size={16} />
        Excel
      </Button>
    </div>
  );
}
