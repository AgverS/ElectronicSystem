import { prisma, exportDemoData, importDemoData } from "@/lib/prisma";
import { translate } from "@/lib/i18n/translate";
import { requireRole } from "@/lib/demo-actor";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";

/**
 * Backups, as the demo can honestly provide them.
 *
 * The full system shells out to `pg_dump` and writes SQL files to a mounted
 * volume. There is no database and no disk here, so a backup is a snapshot of
 * the visitor's own demo dataset, held alongside it in the browser. Creating,
 * listing, downloading, restoring and deleting all genuinely work — which makes
 * the feature demonstrable rather than a stub.
 */

const SNAPSHOT_KEY = "electronic-system-demo-backups";

interface Snapshot {
  filename: string;
  createdAt: string;
  size: number;
  payload: string;
}

function readSnapshots(): Snapshot[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(SNAPSHOT_KEY) ?? "[]") as Snapshot[];
  } catch {
    return [];
  }
}

function writeSnapshots(list: Snapshot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
  } catch {
    // Storage is full — most likely too many snapshots kept at once.
    throw new Error(translate("errors.backupCreateFailed"));
  }
}

async function checkAdmin() {
  const user = await requireRole(Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}

export async function createBackupAction() {
  const actor = await checkAdmin();

  const payload = exportDemoData();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.json`;

  const snapshots = readSnapshots();
  snapshots.unshift({
    filename,
    createdAt: new Date().toISOString(),
    size: payload.length,
    payload,
  });

  // Honour the retention setting, so snapshots cannot fill up browser storage.
  const settings = await prisma.backupSetting.findUnique({ where: { id: "singleton" } });
  const keep = Math.max(1, settings?.keepCount ?? 10);
  writeSnapshots(snapshots.slice(0, keep));

  await prisma.backupSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", lastBackupAt: new Date() },
    update: { lastBackupAt: new Date() },
  });

  await logAction({
    userId: actor.id,
    action: "CREATE_BACKUP",
    entity: "backup",
    entityId: filename,
    meta: { filename },
  });

  return { success: true, filename };
}

export async function listBackupsAction() {
  await checkAdmin();
  return readSnapshots().map((s) => ({
    filename: s.filename,
    size: s.size,
    createdAt: new Date(s.createdAt),
  }));
}

export async function deleteBackupAction(filename: string) {
  const actor = await checkAdmin();

  writeSnapshots(readSnapshots().filter((s) => s.filename !== filename));

  await logAction({
    userId: actor.id,
    action: "DELETE_BACKUP",
    entity: "backup",
    entityId: filename,
    meta: { filename },
  });
}

export async function restoreBackupAction(filename: string) {
  const actor = await checkAdmin();

  const snapshot = readSnapshots().find((s) => s.filename === filename);
  if (!snapshot) throw new Error(translate("errors.restoreFailed"));

  // Recorded before the restore: the audit entry lives in the data being
  // replaced, so writing it afterwards would immediately discard it.
  await logAction({
    userId: actor.id,
    action: "RESTORE_BACKUP",
    entity: "backup",
    entityId: filename,
    meta: { filename },
  });

  if (!importDemoData(snapshot.payload)) {
    throw new Error(translate("errors.restoreFailed"));
  }
}

/** Save a snapshot to the visitor's computer as a JSON file. */
export function downloadBackup(filename: string): boolean {
  const snapshot = readSnapshots().find((s) => s.filename === filename);
  if (!snapshot) return false;

  const url = URL.createObjectURL(new Blob([snapshot.payload], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function getBackupSettingsAction() {
  await checkAdmin();
  const settings = await prisma.backupSetting.findUnique({ where: { id: "singleton" } });
  return {
    enabled: settings?.enabled ?? false,
    intervalHours: settings?.intervalHours ?? 24,
    keepCount: settings?.keepCount ?? 10,
    lastBackupAt: settings?.lastBackupAt ?? null,
  };
}

export async function updateBackupSettingsAction(data: {
  enabled: boolean;
  intervalHours: number;
  keepCount: number;
}) {
  const actor = await checkAdmin();

  await prisma.backupSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  await logAction({
    userId: actor.id,
    action: "UPDATE_BACKUP_SETTINGS",
    entity: "backup_setting",
    entityId: "singleton",
    meta: data,
  });
}
