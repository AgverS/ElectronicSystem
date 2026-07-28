import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { Role, RecordKind } from "@/lib/prisma-client";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export interface DetectResult {
  columns: string[];
  sampleRows: string[][];
  mapping: Omit<ColumnMapping, "hasHeader">;
  hasHeader: boolean;
  /** true = все 5 полей определены уверенно, можно пропустить маппинг */
  confident: boolean;
}

export interface ImportPreviewRow {
  rowIndex: number;
  orderNumber: string;
  rawName: string;
  kind: RecordKind | null;
  reason: string;
  date: string | null; // ISO YYYY-MM-DD or null if unparseable
  studentId: string | null;
  studentName: string | null;
  groupName: string | null;
}

export interface ColumnMapping {
  orderNumber: number;
  name: number;
  kind: number;
  reason: number;
  date: number;
  hasHeader: boolean;
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseKindCell(raw: string): RecordKind | null {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("поощ") || s === "п" || s === "reward" || s === "р") return RecordKind.REWARD;
  if (s.startsWith("взыск") || s === "в" || s === "penalty") return RecordKind.PENALTY;
  return null;
}

/** Parse Russian/ISO date string → ISO YYYY-MM-DD or null. */
function parseDateCell(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // DD.MM.YYYY or D.M.YYYY
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Excel serial number (number of days since 1900-01-01)
  const n = Number(s);
  if (!isNaN(n) && n > 1000 && n < 100000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function formatDateForDisplay(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export { formatDateForDisplay };

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseFile(buf: Buffer): string[][] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  return raw.map((r) => r.map((c) => String(c ?? "").trim()));
}

// ── Column auto-detection ──────────────────────────────────────────────────

const RU_CAPS = /^[А-ЯЁ]/;
const NAME_RE = /^[А-ЯЁа-яё\s\-]+$/;
const ORDER_RE = /^(№\s*)?\d/;

function isRussianName(v: string): boolean {
  const words = v.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 4 && words.every((w) => RU_CAPS.test(w) && NAME_RE.test(w));
}

function isDate(v: string): boolean {
  return parseDateCell(v) !== null;
}

function detectColumns(dataRows: string[][]): {
  mapping: Omit<ColumnMapping, "hasHeader">;
  confident: boolean;
} {
  const fallback = { orderNumber: 0, name: 1, kind: 2, reason: 3, date: 4 };
  if (!dataRows.length) return { mapping: fallback, confident: false };

  const colCount = Math.max(...dataRows.map((r) => r.length));
  const cols: string[][] = Array.from({ length: colCount }, (_, i) =>
    dataRows.map((r) => r[i] ?? "").filter((v) => v),
  );

  const score = (scorer: (v: string) => boolean) => (vals: string[]) =>
    vals.length ? vals.filter(scorer).length / vals.length : 0;

  const kindScore  = score((v) => parseKindCell(v) !== null);
  const nameScore  = score(isRussianName);
  const dateScore  = score(isDate);
  const orderScore = (vals: string[]) => {
    if (!vals.length) return 0;
    const m = vals.filter((v) => ORDER_RE.test(v) || /^\d{1,10}$/.test(v)).length / vals.length;
    const short = vals.reduce((a, v) => a + v.length, 0) / vals.length < 25 ? 0.2 : 0;
    return m + short;
  };
  const reasonScore = (vals: string[]) =>
    vals.length ? Math.min(vals.reduce((a, v) => a + v.length, 0) / vals.length / 60, 1) : 0;

  const assigned = new Set<number>();
  function pickBest(scorer: (vals: string[]) => number) {
    let best = { idx: 0, score: -1 };
    for (let i = 0; i < colCount; i++) {
      if (assigned.has(i)) continue;
      const s = scorer(cols[i]);
      if (s > best.score) best = { idx: i, score: s };
    }
    assigned.add(best.idx);
    return best;
  }

  const kindPick  = pickBest(kindScore);
  const namePick  = pickBest(nameScore);
  const datePick  = pickBest(dateScore);
  const orderPick = pickBest(orderScore);
  const reasonPick = pickBest(reasonScore);

  const mapping = {
    kind:        kindPick.idx,
    name:        namePick.idx,
    date:        datePick.idx,
    orderNumber: orderPick.idx,
    reason:      reasonPick.idx,
  };

  const confident =
    kindPick.score  >= 0.5 &&
    namePick.score  >= 0.4 &&
    datePick.score  >= 0.5 &&
    new Set(Object.values(mapping)).size === 5; // all unique

  return { mapping, confident };
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await requireRole(Role.ADMIN);
  if (!user) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const formData = await req.formData();
  const step = formData.get("step") as string;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  }

  let rows: string[][];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    rows = parseFile(buf);
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 400 });
  }

  if (!rows.length) return NextResponse.json({ error: "Файл пустой" }, { status: 400 });

  // ── detect ─────────────────────────────────────────────────────────────────
  if (step === "detect") {
    const firstRow = rows[0];
    const colCount = Math.max(...rows.slice(0, 6).map((r) => r.length), 1);
    const columns = Array.from({ length: colCount }, (_, i) => firstRow[i] || String.fromCharCode(65 + i));
    const hasHeader = firstRow.every((c) => c && isNaN(Number(c)) && !ORDER_RE.test(c));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const { mapping, confident } = detectColumns(dataRows.slice(0, 30));
    return NextResponse.json({ columns, sampleRows: rows.slice(0, 5), mapping, hasHeader, confident } satisfies DetectResult);
  }

  // ── parse ──────────────────────────────────────────────────────────────────
  if (step === "parse") {
    const mappingRaw = formData.get("mapping");
    if (!mappingRaw) return NextResponse.json({ error: "Не передан маппинг" }, { status: 400 });

    let mapping: ColumnMapping;
    try { mapping = JSON.parse(String(mappingRaw)); }
    catch { return NextResponse.json({ error: "Неверный формат маппинга" }, { status: 400 }); }

    const dataRows = (mapping.hasHeader ? rows.slice(1) : rows).filter((r) => r.some((c) => c));

    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, name: true, group: { select: { name: true } } },
    });
    const nameMap = new Map(students.map((s) => [normalizeName(s.name), s]));

    const preview: ImportPreviewRow[] = dataRows.map((r, i) => {
      const matched = nameMap.get(normalizeName(r[mapping.name] ?? "")) ?? null;
      return {
        rowIndex: i,
        orderNumber: r[mapping.orderNumber] ?? "",
        rawName:     r[mapping.name] ?? "",
        kind:        parseKindCell(r[mapping.kind] ?? ""),
        reason:      r[mapping.reason] ?? "",
        date:        parseDateCell(r[mapping.date] ?? ""),
        studentId:   matched?.id ?? null,
        studentName: matched?.name ?? null,
        groupName:   matched?.group?.name ?? null,
      };
    });

    return NextResponse.json({ rows: preview });
  }

  return NextResponse.json({ error: "Неизвестный шаг" }, { status: 400 });
}
