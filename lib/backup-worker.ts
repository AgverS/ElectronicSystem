import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");

async function ensureBackupDir() {
  try {
    await fs.access(BACKUP_DIR);
  } catch {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }
}

async function performBackup() {
  await ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `auto-backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error("Backup worker: DATABASE_URL not set");
    return;
  }

  try {
    console.log(`Backup worker: Starting backup to ${filename}...`);
    await execAsync(`pg_dump --dbname="${dbUrl}" --file="${filepath}" --format=plain --clean --if-exists`);

    await prisma.backupSetting.update({
      where: { id: "singleton" },
      data: { lastBackupAt: new Date() },
    });

    // Cleanup old backups
    const settings = await prisma.backupSetting.findUnique({ where: { id: "singleton" } });
    if (settings) {
      const files = await fs.readdir(BACKUP_DIR);
      const autoBackups = await Promise.all(
        files
          .filter((f) => f.startsWith("auto-backup-") && f.endsWith(".sql"))
          .map(async (f) => {
            const stats = await fs.stat(path.join(BACKUP_DIR, f));
            return { name: f, createdAt: stats.birthtime };
          })
      );

      autoBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (autoBackups.length > settings.keepCount) {
        const toDelete = autoBackups.slice(settings.keepCount);
        for (const file of toDelete) {
          await fs.unlink(path.join(BACKUP_DIR, file.name));
          console.log(`Backup worker: Deleted old backup ${file.name}`);
        }
      }
    }

    console.log(`Backup worker: Backup completed successfully: ${filename}`);
  } catch (error) {
    console.error("Backup worker: Backup failed:", error);
  }
}

let workerStarted = false;

export function startBackupWorker() {
  if (workerStarted) return;
  workerStarted = true;

  console.log("Backup worker: Starting...");

  // Check every hour
  setInterval(async () => {
    try {
      const settings = await prisma.backupSetting.findUnique({ where: { id: "singleton" } });
      if (!settings || !settings.enabled) return;

      const lastBackup = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
      const now = Date.now();
      const intervalMs = settings.intervalHours * 60 * 60 * 1000;

      if (now - lastBackup >= intervalMs) {
        await performBackup();
      }
    } catch (error) {
      console.error("Backup worker: Error in loop:", error);
    }
  }, 60 * 60 * 1000); // Once per hour
}
