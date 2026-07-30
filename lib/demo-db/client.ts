/**
 * The demo database client.
 *
 * Exposes a Prisma-shaped API (`db.user.findMany(...)`) backed by the in-memory
 * engine. State lives in the visitor's own browser, so anyone can click around
 * and edit freely without affecting anyone else, and "Reset demo data" restores
 * the seeded starting point.
 */

import { DemoEngine, emptyDataset, type Dataset, type Row } from "./engine";
import { MODEL_NAMES, modelDef, JOIN_TABLES, type ModelName } from "./schema";
import type { ModelTypes } from "./types";
import { buildSeed } from "./seed";

const STORAGE_KEY = "electronic-system-demo-db";
/** Bump to invalidate saved snapshots when the seed or schema changes. */
const STORAGE_VERSION = 1;

/* ---------------------------- serialisation ------------------------------ */

function serialise(data: Dataset): string {
  const records: Record<string, Row[]> = {};
  for (const model of MODEL_NAMES) {
    const fields = modelDef(model).fields;
    records[model] = data.records[model].map((row) => {
      const out: Row = {};
      for (const [key, value] of Object.entries(row)) {
        out[key] =
          fields[key]?.type === "date" && value instanceof Date ? value.toISOString() : value;
      }
      return out;
    });
  }
  return JSON.stringify({ version: STORAGE_VERSION, records, joins: data.joins });
}

function deserialise(raw: string): Dataset | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION) return null;

    const data = emptyDataset();
    for (const model of MODEL_NAMES) {
      const fields = modelDef(model).fields;
      data.records[model] = (parsed.records?.[model] ?? []).map((row: Row) => {
        const out: Row = {};
        for (const [key, value] of Object.entries(row)) {
          out[key] =
            fields[key]?.type === "date" && typeof value === "string" ? new Date(value) : value;
        }
        return out;
      });
    }
    for (const join of JOIN_TABLES) data.joins[join] = parsed.joins?.[join] ?? [];
    return data;
  } catch {
    return null;
  }
}

/* ------------------------------ persistence ------------------------------ */

const isBrowser = typeof window !== "undefined";

function loadDataset(): Dataset {
  if (isBrowser) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = deserialise(saved);
      if (parsed) return parsed;
    }
  }
  return buildSeed();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (!isBrowser) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      window.localStorage.setItem(STORAGE_KEY, serialise(engine.getDataset()));
    } catch {
      // Storage full or unavailable — the demo keeps working from memory.
    }
  }, 120);
}

const engine = new DemoEngine(loadDataset(), () => {
  schedulePersist();
  notifyChange();
});

/* ------------------------------ change feed ------------------------------ */

const listeners = new Set<() => void>();

function notifyChange() {
  for (const listener of listeners) listener();
}

/** Subscribe to any mutation, so views can refetch. */
export function onDemoDataChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Serialise the whole dataset — used by the backup feature. */
export function exportDemoData(): string {
  return serialise(engine.getDataset());
}

/** Replace the dataset from a previously exported snapshot. */
export function importDemoData(payload: string): boolean {
  const parsed = deserialise(payload);
  if (!parsed) return false;
  engine.replaceDataset(parsed);
  schedulePersist();
  notifyChange();
  return true;
}

/** Restore the pristine seeded dataset. */
export function resetDemoData() {
  engine.replaceDataset(buildSeed());
  if (isBrowser) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialise(engine.getDataset()));
    } catch {
      // ignore
    }
  }
  notifyChange();
}

/* -------------------------------- client --------------------------------- */

interface BatchResult {
  count: number;
}

/**
 * `T` is the model's row type. Query arguments stay permissive — the engine
 * validates them at runtime — while results are typed, so call sites get real
 * completion and no implicit `any`.
 */
type Delegate<T> = {
  findMany: (args?: Row) => Promise<T[]>;
  findFirst: (args?: Row) => Promise<T | null>;
  findFirstOrThrow: (args?: Row) => Promise<T>;
  findUnique: (args?: Row) => Promise<T | null>;
  findUniqueOrThrow: (args?: Row) => Promise<T>;
  create: (args?: Row) => Promise<T>;
  createMany: (args?: Row) => Promise<BatchResult>;
  createManyAndReturn: (args?: Row) => Promise<T[]>;
  update: (args?: Row) => Promise<T>;
  updateMany: (args?: Row) => Promise<BatchResult>;
  upsert: (args?: Row) => Promise<T>;
  delete: (args?: Row) => Promise<T>;
  deleteMany: (args?: Row) => Promise<BatchResult>;
  count: (args?: Row) => Promise<number>;
  groupBy: (args?: Row) => Promise<any[]>;
};

function delegate<T>(model: ModelName): Delegate<T> {
  // The engine works in untyped rows; the Delegate signature is what callers
  // see, so the cast is confined to this one boundary.
  const ok = (value: unknown): Promise<any> => Promise.resolve(value);
  const orThrow = (value: Row | null, op: string) => {
    if (!value) throw new Error(`demo-db: no ${model} found for ${op}`);
    return value;
  };

  return {
    findMany: (args) => ok(engine.findMany(model, args)),
    findFirst: (args) => ok(engine.findFirst(model, args)),
    findFirstOrThrow: (args) => ok(orThrow(engine.findFirst(model, args), "findFirstOrThrow")),
    findUnique: (args) => ok(engine.findUnique(model, args)),
    findUniqueOrThrow: (args) => ok(orThrow(engine.findUnique(model, args), "findUniqueOrThrow")),
    create: (args) => ok(engine.create(model, args)),
    createMany: (args) => ok(engine.createMany(model, args)),
    createManyAndReturn: (args) => {
      const list = (Array.isArray(args?.data) ? args!.data : [args?.data]) as Row[];
      return ok(list.filter(Boolean).map((data) => engine.create(model, { ...args, data })));
    },
    update: (args) => ok(engine.update(model, args)),
    updateMany: (args) => ok(engine.updateMany(model, args)),
    upsert: (args) => ok(engine.upsert(model, args)),
    delete: (args) => ok(engine.delete(model, args)),
    deleteMany: (args) => ok(engine.deleteMany(model, args)),
    count: (args) => ok(engine.count(model, args)),
    groupBy: (args) => ok(engine.groupBy(model, args)),
  };
}

type DemoClient = {
  [M in ModelName]: Delegate<ModelTypes[M]>;
} & {
  /** Prisma's transaction API, sufficient for demo purposes. */
  $transaction: <T>(work: T) => Promise<unknown>;
};

function createClient(): DemoClient {
  const client = {} as DemoClient;
  for (const model of MODEL_NAMES) {
    (client as Record<ModelName, Delegate<unknown>>)[model] = delegate(model);
  }

  client.$transaction = async (work: unknown) => {
    if (typeof work === "function") return (work as (c: DemoClient) => unknown)(client);
    if (Array.isArray(work)) return Promise.all(work);
    return work;
  };

  return client;
}

export const db = createClient();
export type { DemoClient };
