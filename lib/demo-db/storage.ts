/**
 * Names for everything this demo keeps in the browser.
 *
 * Browser storage is shared across a whole origin, not per directory: a demo at
 * `example.github.io/electronic-system/` and anything else at
 * `example.github.io/other-project/` see the same storage. Two demos published
 * under one account would therefore overwrite each other's data.
 *
 * So every key is namespaced by the deployment. The namespace comes from the
 * base path the site is served under, which is already unique per project, and
 * `NEXT_PUBLIC_DEMO_ID` can override it when two builds share a base path.
 *
 * Keys are defined here and nowhere else — a name repeated across modules is a
 * name that eventually disagrees with itself.
 */

const RAW_NAMESPACE =
  process.env.NEXT_PUBLIC_DEMO_ID || process.env.NEXT_PUBLIC_BASE_PATH || "";

/** "/electronic-system" -> "electronic-system"; empty for a root-domain site. */
const NAMESPACE = RAW_NAMESPACE.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const PREFIX = NAMESPACE ? `ej-demo.${NAMESPACE}` : "ej-demo";

export const STORAGE_KEYS = {
  /** The visitor's own copy of the dataset. */
  database: `${PREFIX}.database`,
  /** Which persona they are currently viewing as. */
  persona: `${PREFIX}.persona`,
  /** Their chosen language. */
  locale: `${PREFIX}.locale`,
  /** Snapshots taken from the backups screen. */
  backups: `${PREFIX}.backups`,
} as const;

/** Every key this demo owns — used when clearing its storage. */
export const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);
