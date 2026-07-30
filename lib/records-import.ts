"use client";

/**
 * Bulk import of rewards and penalties from a spreadsheet.
 *
 * This ran on the server in the full system. Here the workbook is read in the
 * browser — which suits a demo well: the visitor's file never leaves their
 * machine.
 *
 * Column detection is heuristic. Rather than demand a fixed template, each
 * column is scored on how well its values look like a reference, a name, a
 * kind, a date or a free-text reason, and the best match for each field wins.
 * When every field scores confidently the mapping step is skipped entirely.
 */

import ExcelJS from "exceljs";
import { RecordKind } from "@/lib/prisma-client";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-client";

export interface ColumnMapping {
  orderNumber: number;
  name: number;
  kind: number;
  reason: number;
  date: number;
  hasHeader: boolean;
}

export interface DetectResult {
  columns: string[];
  sampleRows: string[][];
  mapping: Omit<ColumnMapping, "hasHeader">;
  hasHeader: boolean;
  /** All five fields identified confidently — the mapping step can be skipped. */
  confident: boolean;
}

export interface ImportPreviewRow {
  rowIndex: number;
  orderNumber: string;
  rawName: string;
  kind: RecordKind | null;
  reason: string;
  date: string | null;
  studentId: string | null;
  studentName: string | null;
  groupName: string | null;
}

/* ------------------------------- parsing --------------------------------- */

/** Recognises the kind in any of the supported languages, plus initials. */
export function parseKindCell(raw: string): RecordKind | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const reward = ["reward", "commendation", "récompense", "recompense", "recompensa", "belohnung", "поощ"];
  const penalty = ["penalty", "sanction", "sanción", "sancion", "strafe", "verweis", "взыск"];
  if (reward.some((w) => s.startsWith(w)) || s === "r" || s === "п" || s === "р") return RecordKind.REWARD;
  if (penalty.some((w) => s.startsWith(w)) || s === "p" || s === "в") return RecordKind.PENALTY;
  return null;
}

/** Accepts D/M/YYYY, YYYY-MM-DD and Excel serial dates. Returns ISO or null. */
export function parseDateCell(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel stores dates as days since 1899-12-30.
  const n = Number(s);
  if (!isNaN(n) && n > 1000 && n < 100000) {
    return new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);
  }

  return null;
}

export function formatDateForDisplay(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Read the first worksheet into a grid of trimmed strings. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      let text = "";
      if (v === null || v === undefined) text = "";
      else if (v instanceof Date) text = v.toISOString().slice(0, 10);
      else if (typeof v === "object" && "text" in v) text = String((v as { text: unknown }).text ?? "");
      else if (typeof v === "object" && "result" in v)
        text = String((v as { result: unknown }).result ?? "");
      else text = String(v);
      values.push(text.trim());
    });
    rows.push(values);
  });
  return rows;
}

/* --------------------------- column detection ---------------------------- */

// Latin and Cyrillic both, so the importer works whatever the register keeps.
const CAPITALISED = /^[\p{Lu}]/u;
const NAME_CHARS = /^[\p{L}\s'’-]+$/u;
const ORDER_RE = /^(№\s*)?[A-Za-z]?[-\s]?\d/;

function looksLikeName(v: string): boolean {
  const words = v.trim().split(/\s+/);
  return (
    words.length >= 2 &&
    words.length <= 4 &&
    words.every((w) => CAPITALISED.test(w) && NAME_CHARS.test(w))
  );
}

function detectColumns(dataRows: string[][]): {
  mapping: Omit<ColumnMapping, "hasHeader">;
  confident: boolean;
} {
  const fallback = { orderNumber: 0, name: 1, kind: 2, reason: 3, date: 4 };
  if (!dataRows.length) return { mapping: fallback, confident: false };

  const colCount = Math.max(...dataRows.map((r) => r.length));
  const cols: string[][] = Array.from({ length: colCount }, (_, i) =>
    dataRows.map((r) => r[i] ?? "").filter(Boolean),
  );

  const ratio = (test: (v: string) => boolean) => (vals: string[]) =>
    vals.length ? vals.filter(test).length / vals.length : 0;

  const kindScore = ratio((v) => parseKindCell(v) !== null);
  const nameScore = ratio(looksLikeName);
  const dateScore = ratio((v) => parseDateCell(v) !== null);
  const orderScore = (vals: string[]) => {
    if (!vals.length) return 0;
    const matches =
      vals.filter((v) => ORDER_RE.test(v) || /^\d{1,10}$/.test(v)).length / vals.length;
    const shortBonus = vals.reduce((a, v) => a + v.length, 0) / vals.length < 25 ? 0.2 : 0;
    return matches + shortBonus;
  };
  // A reason is free text, so length is the signal.
  const reasonScore = (vals: string[]) =>
    vals.length ? Math.min(vals.reduce((a, v) => a + v.length, 0) / vals.length / 60, 1) : 0;

  const assigned = new Set<number>();
  const pickBest = (scorer: (vals: string[]) => number) => {
    let best = { idx: 0, score: -1 };
    for (let i = 0; i < colCount; i++) {
      if (assigned.has(i)) continue;
      const score = scorer(cols[i]);
      if (score > best.score) best = { idx: i, score };
    }
    assigned.add(best.idx);
    return best;
  };

  const kindPick = pickBest(kindScore);
  const namePick = pickBest(nameScore);
  const datePick = pickBest(dateScore);
  const orderPick = pickBest(orderScore);
  const reasonPick = pickBest(reasonScore);

  const mapping = {
    kind: kindPick.idx,
    name: namePick.idx,
    date: datePick.idx,
    orderNumber: orderPick.idx,
    reason: reasonPick.idx,
  };

  const confident =
    kindPick.score >= 0.5 &&
    namePick.score >= 0.4 &&
    datePick.score >= 0.5 &&
    new Set(Object.values(mapping)).size === 5;

  return { mapping, confident };
}

/* -------------------------------- steps ---------------------------------- */

export async function detectSpreadsheet(file: File): Promise<DetectResult> {
  const rows = await readSpreadsheet(file);
  if (!rows.length) throw new Error("empty");

  const firstRow = rows[0];
  const colCount = Math.max(...rows.slice(0, 6).map((r) => r.length), 1);
  const columns = Array.from(
    { length: colCount },
    (_, i) => firstRow[i] || String.fromCharCode(65 + i),
  );
  // A header row has no numbers and no reference-looking values.
  const hasHeader = firstRow.every((c) => c && isNaN(Number(c)) && !ORDER_RE.test(c));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const { mapping, confident } = detectColumns(dataRows.slice(0, 30));

  return { columns, sampleRows: rows.slice(0, 5), mapping, hasHeader, confident };
}

export async function buildImportPreview(
  file: File,
  mapping: ColumnMapping,
): Promise<ImportPreviewRow[]> {
  const rows = await readSpreadsheet(file);
  const dataRows = (mapping.hasHeader ? rows.slice(1) : rows).filter((r) => r.some(Boolean));

  const students = await prisma.user.findMany({
    where: { role: Role.STUDENT },
    select: { id: true, name: true, group: { select: { name: true } } },
  });
  const byName = new Map(students.map((s) => [normalizeName(s.name), s]));

  return dataRows.map((r, i) => {
    const matched = byName.get(normalizeName(r[mapping.name] ?? "")) ?? null;
    return {
      rowIndex: i,
      orderNumber: r[mapping.orderNumber] ?? "",
      rawName: r[mapping.name] ?? "",
      kind: parseKindCell(r[mapping.kind] ?? ""),
      reason: r[mapping.reason] ?? "",
      date: parseDateCell(r[mapping.date] ?? ""),
      studentId: matched?.id ?? null,
      studentName: matched?.name ?? null,
      groupName: matched?.group?.name ?? null,
    };
  });
}
