export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupWorker } = await import("@/lib/backup-worker");
    startBackupWorker();

    const { startTelegramPolling } = await import("@/lib/telegram-polling");
    startTelegramPolling();
  }
}
