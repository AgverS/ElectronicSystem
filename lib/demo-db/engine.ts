/**
 * A small query engine that speaks the subset of the Prisma dialect this app
 * uses, so data-access code written against Prisma runs unchanged in the
 * browser against an in-memory dataset.
 *
 * Supported: findMany / findUnique(OrThrow) / findFirst(OrThrow) / create /
 * createMany / update / updateMany / upsert / delete / deleteMany / count /
 * groupBy, with where (equality, in, notIn, not, contains, startsWith,
 * endsWith, lt/lte/gt/gte, AND/OR/NOT, to-one and some/every/none relation
 * filters), include (nested, with per-relation where/orderBy/take/skip and
 * _count), select, orderBy (scalar, array, and one level of relation),
 * skip/take and distinct. Nested writes support connect / disconnect / set /
 * create / createMany / deleteMany / updateMany.
 */

import {
  JOIN_TABLES,
  MODEL_NAMES,
  modelDef,
  type JoinName,
  type ModelName,
  type RelationDef,
} from "./schema";

export type Row = Record<string, any>;

export interface Dataset {
  records: Record<ModelName, Row[]>;
  joins: Record<JoinName, Array<Record<string, string>>>;
}

export function emptyDataset(): Dataset {
  const records = {} as Dataset["records"];
  for (const m of MODEL_NAMES) records[m] = [];
  const joins = {} as Dataset["joins"];
  for (const j of JOIN_TABLES) joins[j] = [];
  return { records, joins };
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

let idCounter = 0;
export function cuid(): string {
  idCounter += 1;
  return `c${Date.now().toString(36)}${idCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function clone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (Array.isArray(value)) return value.map(clone) as unknown as T;
  const out: Row = {};
  for (const [k, v] of Object.entries(value as Row)) out[k] = clone(v);
  return out as T;
}

/** Dates compare by timestamp; everything else by natural order. */
function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function equal(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date && typeof b === "string") return a.getTime() === new Date(b).getTime();
  if (b instanceof Date && typeof a === "string") return new Date(a).getTime() === b.getTime();
  return a === b;
}

const OPERATORS = new Set([
  "equals", "not", "in", "notIn", "contains", "startsWith", "endsWith",
  "lt", "lte", "gt", "gte", "mode", "is", "isNot", "some", "every", "none",
]);

function isOperatorObject(value: unknown): value is Row {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Date) &&
    !Array.isArray(value) &&
    Object.keys(value as Row).some((k) => OPERATORS.has(k))
  );
}

/* -------------------------------------------------------------------------- */
/* engine                                                                      */
/* -------------------------------------------------------------------------- */

export class DemoEngine {
  constructor(
    private data: Dataset,
    /** Called after any mutation so the caller can persist. */
    private onChange: () => void = () => {},
  ) {}

  replaceDataset(next: Dataset) {
    this.data = next;
  }

  getDataset(): Dataset {
    return this.data;
  }

  private rows(model: ModelName): Row[] {
    return this.data.records[model];
  }

  /* ------------------------------ filtering ------------------------------ */

  private matchScalar(value: unknown, condition: unknown): boolean {
    if (condition === undefined) return true;

    if (isOperatorObject(condition)) {
      const c = condition as Row;
      const insensitive = c.mode === "insensitive";
      const norm = (v: unknown) =>
        insensitive && typeof v === "string" ? v.toLowerCase() : v;

      if ("equals" in c && !equal(value, c.equals)) return false;
      if ("not" in c) {
        // `not` accepts either a literal or a nested operator object.
        if (isOperatorObject(c.not)) {
          if (this.matchScalar(value, c.not)) return false;
        } else if (equal(value, c.not)) return false;
      }
      if ("in" in c) {
        const list = (c.in ?? []) as unknown[];
        if (!list.some((v) => equal(value, v))) return false;
      }
      if ("notIn" in c) {
        const list = (c.notIn ?? []) as unknown[];
        if (list.some((v) => equal(value, v))) return false;
      }
      if ("contains" in c) {
        const hay = norm(value);
        const needle = norm(c.contains);
        if (typeof hay !== "string" || typeof needle !== "string" || !hay.includes(needle))
          return false;
      }
      if ("startsWith" in c) {
        const hay = norm(value);
        const needle = norm(c.startsWith);
        if (typeof hay !== "string" || typeof needle !== "string" || !hay.startsWith(needle))
          return false;
      }
      if ("endsWith" in c) {
        const hay = norm(value);
        const needle = norm(c.endsWith);
        if (typeof hay !== "string" || typeof needle !== "string" || !hay.endsWith(needle))
          return false;
      }
      if ("lt" in c && !(compare(value, c.lt) < 0)) return false;
      if ("lte" in c && !(compare(value, c.lte) <= 0)) return false;
      if ("gt" in c && !(compare(value, c.gt) > 0)) return false;
      if ("gte" in c && !(compare(value, c.gte) >= 0)) return false;
      return true;
    }

    return equal(value, condition);
  }

  private matchWhere(model: ModelName, row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    const def = modelDef(model);

    for (const [key, condition] of Object.entries(where)) {
      if (condition === undefined) continue;

      if (key === "AND") {
        const list = Array.isArray(condition) ? condition : [condition];
        if (!list.every((w) => this.matchWhere(model, row, w as Row))) return false;
        continue;
      }
      if (key === "OR") {
        const list = (Array.isArray(condition) ? condition : [condition]) as Row[];
        if (list.length && !list.some((w) => this.matchWhere(model, row, w))) return false;
        continue;
      }
      if (key === "NOT") {
        const list = Array.isArray(condition) ? condition : [condition];
        if (list.some((w) => this.matchWhere(model, row, w as Row))) return false;
        continue;
      }

      const relation = def.relations[key];
      if (relation) {
        if (!this.matchRelation(row, relation, condition)) return false;
        continue;
      }

      if (!this.matchScalar(row[key], condition)) return false;
    }

    return true;
  }

  private matchRelation(row: Row, relation: RelationDef, condition: unknown): boolean {
    if (relation.kind === "one") {
      const target = this.resolveOne(row, relation);
      if (condition === null) return target === null;
      const c = condition as Row;
      if (c && typeof c === "object" && ("is" in c || "isNot" in c)) {
        if ("is" in c) {
          if (c.is === null) {
            if (target !== null) return false;
          } else if (!target || !this.matchWhere(relation.model, target, c.is as Row)) {
            return false;
          }
        }
        if ("isNot" in c) {
          if (c.isNot === null) {
            if (target === null) return false;
          } else if (target && this.matchWhere(relation.model, target, c.isNot as Row)) {
            return false;
          }
        }
        return true;
      }
      return target !== null && this.matchWhere(relation.model, target, condition as Row);
    }

    const targets = this.resolveMany(row, relation);
    const c = (condition ?? {}) as Row;
    if ("some" in c) {
      if (!targets.some((t) => this.matchWhere(relation.model, t, c.some as Row))) return false;
    }
    if ("every" in c) {
      if (!targets.every((t) => this.matchWhere(relation.model, t, c.every as Row))) return false;
    }
    if ("none" in c) {
      if (targets.some((t) => this.matchWhere(relation.model, t, c.none as Row))) return false;
    }
    return true;
  }

  /* ------------------------------ relations ------------------------------ */

  private resolveOne(row: Row, relation: Extract<RelationDef, { kind: "one" }>): Row | null {
    const fk = row[relation.fk];
    if (fk === null || fk === undefined) return null;
    return this.rows(relation.model).find((r) => r.id === fk) ?? null;
  }

  private resolveMany(row: Row, relation: RelationDef): Row[] {
    if (relation.kind === "many") {
      return this.rows(relation.model).filter((r) => r[relation.backFk] === row.id);
    }
    if (relation.kind === "manyToMany") {
      const links = this.data.joins[relation.join].filter((l) => l[relation.self] === row.id);
      const ids = new Set(links.map((l) => l[relation.other]));
      return this.rows(relation.model).filter((r) => ids.has(r.id));
    }
    const one = this.resolveOne(row, relation);
    return one ? [one] : [];
  }

  /* ------------------------------ projection ----------------------------- */

  /** Build the object Prisma would return for a row, honouring select/include. */
  private project(model: ModelName, row: Row, args: Row = {}): Row {
    const def = modelDef(model);
    const { select, include } = args;
    let out: Row = {};

    if (select) {
      for (const [key, spec] of Object.entries(select as Row)) {
        if (!spec) continue;
        if (key === "_count") {
          out._count = this.buildCount(model, row, spec as Row);
          continue;
        }
        const relation = def.relations[key];
        if (relation) {
          out[key] = this.projectRelation(row, relation, spec);
        } else {
          out[key] = clone(row[key]);
        }
      }
    } else {
      for (const key of Object.keys(def.fields)) out[key] = clone(row[key]);
    }

    if (include) {
      for (const [key, spec] of Object.entries(include as Row)) {
        if (!spec) continue;
        if (key === "_count") {
          out._count = this.buildCount(model, row, spec as Row);
          continue;
        }
        const relation = def.relations[key];
        if (!relation) continue;
        out[key] = this.projectRelation(row, relation, spec);
      }
    }

    return out;
  }

  private projectRelation(row: Row, relation: RelationDef, spec: unknown): unknown {
    const args = (spec === true ? {} : spec ?? {}) as Row;

    if (relation.kind === "one") {
      const target = this.resolveOne(row, relation);
      return target ? this.project(relation.model, target, args) : null;
    }

    let list = this.resolveMany(row, relation);
    if (args.where) list = list.filter((r) => this.matchWhere(relation.model, r, args.where as Row));
    list = this.sort(list, args.orderBy);
    list = this.paginate(list, args);
    return list.map((r) => this.project(relation.model, r, args));
  }

  private buildCount(model: ModelName, row: Row, spec: Row): Row {
    const def = modelDef(model);
    const selection = (spec.select ?? spec) as Row;
    const out: Row = {};
    for (const [key, want] of Object.entries(selection)) {
      if (!want) continue;
      const relation = def.relations[key];
      if (!relation) continue;
      let list = this.resolveMany(row, relation);
      const nested = (want === true ? {} : want) as Row;
      if (nested.where)
        list = list.filter((r) => this.matchWhere(relation.model, r, nested.where as Row));
      out[key] = list.length;
    }
    return out;
  }

  /* -------------------------- ordering / paging -------------------------- */

  private sort(list: Row[], orderBy: unknown): Row[] {
    if (!orderBy) return list;
    const clauses = (Array.isArray(orderBy) ? orderBy : [orderBy]) as Row[];
    if (!clauses.length) return list;

    return [...list].sort((a, b) => {
      for (const clause of clauses) {
        for (const [field, dir] of Object.entries(clause)) {
          if (dir === undefined) continue;
          let av: unknown;
          let bv: unknown;

          if (typeof dir === "object" && dir !== null) {
            // One level of relation ordering, e.g. { subject: { name: "asc" } }.
            const [nestedField, nestedDir] = Object.entries(dir as Row)[0] ?? [];
            if (!nestedField) continue;
            av = this.relationSortValue(a, field, nestedField);
            bv = this.relationSortValue(b, field, nestedField);
            const cmp = compare(av, bv);
            if (cmp !== 0) return nestedDir === "desc" ? -cmp : cmp;
            continue;
          }

          av = a[field];
          bv = b[field];
          const cmp = compare(av, bv);
          if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  private relationSortValue(row: Row, relationName: string, field: string): unknown {
    for (const model of MODEL_NAMES) {
      const relation = modelDef(model).relations[relationName];
      if (!relation || relation.kind !== "one") continue;
      if (row[relation.fk] === undefined) continue;
      const target = this.resolveOne(row, relation);
      return target?.[field];
    }
    return undefined;
  }

  private paginate(list: Row[], args: Row): Row[] {
    const skip = typeof args.skip === "number" ? args.skip : 0;
    const take = typeof args.take === "number" ? args.take : undefined;
    if (!skip && take === undefined) return list;
    return take === undefined ? list.slice(skip) : list.slice(skip, skip + take);
  }

  private distinct(list: Row[], fields: unknown): Row[] {
    if (!Array.isArray(fields) || !fields.length) return list;
    const seen = new Set<string>();
    return list.filter((row) => {
      const key = fields.map((f) => String(row[f as string])).join(" ");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /* ------------------------------ read API ------------------------------- */

  findMany(model: ModelName, args: Row = {}): Row[] {
    let list = this.rows(model).filter((r) => this.matchWhere(model, r, args.where as Row));
    list = this.sort(list, args.orderBy);
    list = this.distinct(list, args.distinct);
    list = this.paginate(list, args);
    return list.map((r) => this.project(model, r, args));
  }

  findFirst(model: ModelName, args: Row = {}): Row | null {
    return this.findMany(model, { ...args, take: 1 })[0] ?? null;
  }

  findUnique(model: ModelName, args: Row = {}): Row | null {
    const row = this.locate(model, args.where as Row);
    return row ? this.project(model, row, args) : null;
  }

  count(model: ModelName, args: Row = {}): number {
    let list = this.rows(model).filter((r) => this.matchWhere(model, r, args.where as Row));
    list = this.distinct(list, args.distinct);
    return this.paginate(list, args).length;
  }

  groupBy(model: ModelName, args: Row = {}): Row[] {
    const by = (args.by ?? []) as string[];
    const list = this.rows(model).filter((r) => this.matchWhere(model, r, args.where as Row));
    const buckets = new Map<string, Row[]>();

    for (const row of list) {
      const key = by.map((f) => String(row[f])).join(" ");
      const bucket = buckets.get(key);
      if (bucket) bucket.push(row);
      else buckets.set(key, [row]);
    }

    const out = [...buckets.values()].map((bucket) => {
      const entry: Row = {};
      for (const field of by) entry[field] = clone(bucket[0][field]);
      if (args._count !== undefined) {
        entry._count =
          args._count === true
            ? bucket.length
            : Object.fromEntries(
                Object.keys(args._count as Row).map((f) => [
                  f,
                  bucket.filter((r) => r[f] !== null && r[f] !== undefined).length,
                ]),
              );
      }
      return entry;
    });

    return this.sort(out, args.orderBy);
  }

  /** Resolve a `where` that targets exactly one row, including compound keys. */
  private locate(model: ModelName, where: Row | undefined): Row | null {
    if (!where) return null;
    const flattened: Row = {};

    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      const isCompoundKey =
        typeof value === "object" &&
        value !== null &&
        !(value instanceof Date) &&
        !Array.isArray(value) &&
        !isOperatorObject(value) &&
        !modelDef(model).relations[key];
      if (isCompoundKey) Object.assign(flattened, value as Row);
      else flattened[key] = value;
    }

    return this.rows(model).find((r) => this.matchWhere(model, r, flattened)) ?? null;
  }

  /* ------------------------------ write API ------------------------------ */

  private applyDefaults(model: ModelName, input: Row): Row {
    const def = modelDef(model);
    const row: Row = {};

    for (const [name, field] of Object.entries(def.fields)) {
      let value = input[name];

      if (value === undefined) {
        if (field.default === "cuid") value = cuid();
        else if (field.default === "now") value = new Date();
        else if (typeof field.default === "function") value = field.default();
        else if (field.default !== undefined) value = field.default;
        else value = null;
      }

      row[name] = this.coerce(field.type, value);
    }

    return row;
  }

  private coerce(type: string, value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (type === "date") return value instanceof Date ? value : new Date(value as string);
    if (type === "int") return typeof value === "number" ? value : Number(value);
    if (type === "bool") return Boolean(value);
    return value;
  }

  create(model: ModelName, args: Row = {}): Row {
    const data = (args.data ?? {}) as Row;
    const { scalars, nested } = this.splitWrite(model, data);
    const row = this.applyDefaults(model, scalars);
    this.rows(model).push(row);
    this.applyNestedWrites(model, row, nested);
    this.onChange();
    return this.project(model, row, args);
  }

  createMany(model: ModelName, args: Row = {}): { count: number } {
    const list = (Array.isArray(args.data) ? args.data : [args.data]) as Row[];
    let count = 0;
    for (const item of list) {
      if (!item) continue;
      const { scalars, nested } = this.splitWrite(model, item);
      const row = this.applyDefaults(model, scalars);
      this.rows(model).push(row);
      this.applyNestedWrites(model, row, nested);
      count += 1;
    }
    this.onChange();
    return { count };
  }

  update(model: ModelName, args: Row = {}): Row {
    const row = this.locate(model, args.where as Row);
    if (!row) throw new Error(`demo-db: no ${model} matched update`);
    this.writeInto(model, row, (args.data ?? {}) as Row);
    this.onChange();
    return this.project(model, row, args);
  }

  updateMany(model: ModelName, args: Row = {}): { count: number } {
    const list = this.rows(model).filter((r) => this.matchWhere(model, r, args.where as Row));
    for (const row of list) this.writeInto(model, row, (args.data ?? {}) as Row);
    this.onChange();
    return { count: list.length };
  }

  upsert(model: ModelName, args: Row = {}): Row {
    const row = this.locate(model, args.where as Row);
    if (row) {
      this.writeInto(model, row, (args.update ?? {}) as Row);
      this.onChange();
      return this.project(model, row, args);
    }
    // Prisma seeds the new row from the unique selector plus `create`.
    const seed = { ...this.flattenUnique(model, args.where as Row), ...((args.create ?? {}) as Row) };
    return this.create(model, { ...args, data: seed });
  }

  private flattenUnique(model: ModelName, where: Row | undefined): Row {
    const out: Row = {};
    if (!where) return out;
    const def = modelDef(model);
    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (def.fields[key]) {
        if (!isOperatorObject(value)) out[key] = value;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const [k, v] of Object.entries(value as Row)) {
          if (def.fields[k]) out[k] = v;
        }
      }
    }
    return out;
  }

  delete(model: ModelName, args: Row = {}): Row {
    const row = this.locate(model, args.where as Row);
    if (!row) throw new Error(`demo-db: no ${model} matched delete`);
    const projected = this.project(model, row, args);
    this.removeRows(model, [row]);
    this.onChange();
    return projected;
  }

  deleteMany(model: ModelName, args: Row = {}): { count: number } {
    const list = this.rows(model).filter((r) => this.matchWhere(model, r, args.where as Row));
    this.removeRows(model, list);
    this.onChange();
    return { count: list.length };
  }

  /** Delete rows and follow the schema's cascade / set-null rules. */
  private removeRows(model: ModelName, rows: Row[]) {
    if (!rows.length) return;
    const def = modelDef(model);
    const ids = new Set(rows.map((r) => r.id));

    for (const relation of Object.values(def.relations)) {
      if (relation.kind === "many") {
        const children = this.rows(relation.model).filter((c) => ids.has(c[relation.backFk]));
        if (!children.length) continue;
        if (relation.onDelete === "cascade") this.removeRows(relation.model, children);
        else for (const child of children) child[relation.backFk] = null;
      } else if (relation.kind === "manyToMany") {
        this.data.joins[relation.join] = this.data.joins[relation.join].filter(
          (l) => !ids.has(l[relation.self]),
        );
      }
    }

    this.data.records[model] = this.rows(model).filter((r) => !ids.has(r.id));
  }

  /** Split a write payload into scalar fields and nested relation operations. */
  private splitWrite(model: ModelName, data: Row): { scalars: Row; nested: Row } {
    const def = modelDef(model);
    const scalars: Row = {};
    const nested: Row = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      if (def.relations[key]) nested[key] = value;
      else scalars[key] = value;
    }
    return { scalars, nested };
  }

  private writeInto(model: ModelName, row: Row, data: Row) {
    const def = modelDef(model);
    const { scalars, nested } = this.splitWrite(model, data);

    for (const [key, value] of Object.entries(scalars)) {
      const field = def.fields[key];
      if (!field) continue;
      // Numeric atomic updates, e.g. { increment: 1 }.
      if (
        value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        ("increment" in value || "decrement" in value || "set" in value)
      ) {
        const v = value as Row;
        if ("set" in v) row[key] = this.coerce(field.type, v.set);
        else if ("increment" in v) row[key] = (row[key] ?? 0) + Number(v.increment);
        else if ("decrement" in v) row[key] = (row[key] ?? 0) - Number(v.decrement);
        continue;
      }
      row[key] = this.coerce(field.type, value);
    }

    for (const [name, field] of Object.entries(def.fields)) {
      if (field.updatedAt) row[name] = new Date();
    }

    this.applyNestedWrites(model, row, nested);
  }

  private applyNestedWrites(model: ModelName, row: Row, nested: Row) {
    const def = modelDef(model);

    for (const [key, rawOps] of Object.entries(nested)) {
      const relation = def.relations[key];
      if (!relation) continue;
      const ops = rawOps as Row;

      if (relation.kind === "one") {
        if (ops.connect) {
          const target = this.locate(relation.model, ops.connect as Row);
          if (target) row[relation.fk] = target.id;
        }
        if (ops.disconnect) row[relation.fk] = null;
        if (ops.create) {
          const created = this.create(relation.model, { data: ops.create });
          row[relation.fk] = created.id;
        }
        continue;
      }

      const asList = (v: unknown): Row[] =>
        v === undefined || v === null ? [] : Array.isArray(v) ? (v as Row[]) : [v as Row];

      if (ops.set !== undefined) this.setRelation(row, relation, asList(ops.set));
      if (ops.connect) this.connectRelation(row, relation, asList(ops.connect));
      if (ops.disconnect) this.disconnectRelation(row, relation, asList(ops.disconnect));

      if (ops.create) {
        for (const item of asList(ops.create)) this.createChild(row, relation, item);
      }
      if (ops.createMany) {
        for (const item of asList((ops.createMany as Row).data)) {
          this.createChild(row, relation, item);
        }
      }
      if (ops.deleteMany) {
        for (const where of asList(ops.deleteMany)) {
          const children = this.resolveMany(row, relation).filter((c) =>
            this.matchWhere(relation.model, c, where),
          );
          this.removeRows(relation.model, children);
        }
      }
      if (ops.updateMany) {
        for (const op of asList(ops.updateMany)) {
          const children = this.resolveMany(row, relation).filter((c) =>
            this.matchWhere(relation.model, c, op.where as Row),
          );
          for (const child of children) this.writeInto(relation.model, child, (op.data ?? {}) as Row);
        }
      }
    }
  }

  private createChild(row: Row, relation: RelationDef, data: Row) {
    if (relation.kind === "many") {
      this.create(relation.model, { data: { ...data, [relation.backFk]: row.id } });
      return;
    }
    if (relation.kind === "manyToMany") {
      const created = this.create(relation.model, { data });
      this.linkJoin(relation, row.id, created.id);
    }
  }

  private linkJoin(
    relation: Extract<RelationDef, { kind: "manyToMany" }>,
    selfId: string,
    otherId: string,
  ) {
    const table = this.data.joins[relation.join];
    const exists = table.some(
      (l) => l[relation.self] === selfId && l[relation.other] === otherId,
    );
    if (!exists) table.push({ [relation.self]: selfId, [relation.other]: otherId });
  }

  private connectRelation(row: Row, relation: RelationDef, selectors: Row[]) {
    for (const selector of selectors) {
      const target = this.locate(relation.model, selector);
      if (!target) continue;
      if (relation.kind === "many") target[relation.backFk] = row.id;
      else if (relation.kind === "manyToMany") this.linkJoin(relation, row.id, target.id);
    }
  }

  private disconnectRelation(row: Row, relation: RelationDef, selectors: Row[]) {
    for (const selector of selectors) {
      const target = this.locate(relation.model, selector);
      if (!target) continue;
      if (relation.kind === "many") {
        if (target[relation.backFk] === row.id) target[relation.backFk] = null;
      } else if (relation.kind === "manyToMany") {
        this.data.joins[relation.join] = this.data.joins[relation.join].filter(
          (l) => !(l[relation.self] === row.id && l[relation.other] === target.id),
        );
      }
    }
  }

  private setRelation(row: Row, relation: RelationDef, selectors: Row[]) {
    if (relation.kind === "many") {
      for (const current of this.resolveMany(row, relation)) current[relation.backFk] = null;
    } else if (relation.kind === "manyToMany") {
      this.data.joins[relation.join] = this.data.joins[relation.join].filter(
        (l) => l[relation.self] !== row.id,
      );
    }
    this.connectRelation(row, relation, selectors);
  }
}
