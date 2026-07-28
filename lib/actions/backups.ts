import { prisma } from "@/lib/prisma";
import { translate } from "@/lib/i18n/provider";
import { requireRole, getCurrentUser } from "@/lib/demo-actor";
import { Role } from "@/lib/prisma-client";
import { logAction } from "@/lib/audit";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

async function checkAdmin() {
  const user = await requireRole(Role.ADMIN);
  if (!user) throw new Error(translate("errors.accessDenied"));
  return user;
}

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

export async function createBackupAction() {
  const actor = await checkAdmin();
  await ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL не настроена");

  try {
    // Using --clean to include DROP commands in the SQL dump
    // Or use -Fc for custom format which is more flexible for restore
    await execAsync(`pg_dump --dbname="${dbUrl}" --file="${filepath}" --format=plain --clean --if-exists`);

    await logAction({
      userId: actor.id,
      action: "CREATE_BACKUP",
      entity: "backup",
      entityId: filename,
      meta: { filename },
    });
    return { success: true, filename };
  } catch (error) {
    console.error("Backup failed:", error);
    throw new Error("Не удалось создать бэкап");
  }
}

export async function listBackupsAction() {
  await checkAdmin();
  await ensureBackupDir();

  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith(".sql"))
        .map(async (f) => {
          const stats = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            filename: f,
            size: stats.size,
            createdAt: stats.birthtime,
          };
        })
    );

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error("Failed to list backups:", error);
    return [];
  }
}

export async function deleteBackupAction(filename: string) {
  const actor = await checkAdmin();
  const filepath = path.join(BACKUP_DIR, filename);

  try {
    await fs.unlink(filepath);
    await logAction({
      userId: actor.id,
      action: "DELETE_BACKUP",
      entity: "backup",
      entityId: filename,
    });
    return { success: true };
  } catch (error) {
    console.error("Delete failed:", error);
    throw new Error("Не удалось удалить бэкап");
  }
}

export async function restoreBackupAction(filename: string) {
  const actor = await checkAdmin();
  const filepath = path.join(BACKUP_DIR, filename);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL не настроена");

  try {
    // When restoring a plain SQL dump with --clean, psql is used
    await execAsync(`psql --dbname="${dbUrl}" --file="${filepath}"`);

    await logAction({
      userId: actor.id,
      action: "RESTORE_BACKUP",
      entity: "backup",
      entityId: filename,
    });
    return { success: true };
  } catch (error) {
    console.error("Restore failed:", error);
    throw new Error("Не удалось восстановить бэкап. Проверьте логи сервера.");
  }
}

export async function getBackupSettingsAction() {
  await checkAdmin();
  const settings = await prisma.backupSetting.findUnique({
    where: { id: "singleton" },
  });

  return settings || {
    enabled: false,
    intervalHours: 24,
    keepCount: 10,
  };
}

export async function updateBackupSettingsAction(data: {
  enabled: boolean;
  intervalHours: number;
  keepCount: number;
}) {
  const actor = await checkAdmin();

  const settings = await prisma.backupSetting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      ...data,
    },
    update: data,
  });

  await logAction({
    userId: actor.id,
    action: "UPDATE_BACKUP_SETTINGS",
    entity: "backup_settings",
    meta: data,
  });
  return settings;
}
