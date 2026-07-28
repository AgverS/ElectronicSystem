import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

// Local disk storage for record attachments. In production this points at a
// mounted Docker volume (UPLOAD_DIR=/app/uploads); in dev it falls back to
// ./uploads (gitignored). Only metadata lives in the DB.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file

// Stored keys are server-generated UUIDs, but guard against traversal anyway.
function resolveKey(storageKey: string) {
  return path.join(UPLOAD_DIR, path.basename(storageKey));
}

export async function saveUpload(file: File): Promise<{ storageKey: string; size: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = crypto.randomUUID();
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(resolveKey(storageKey), buffer);
  return { storageKey, size: buffer.byteLength };
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  return readFile(resolveKey(storageKey));
}

export async function deleteUpload(storageKey: string): Promise<void> {
  try {
    await unlink(resolveKey(storageKey));
  } catch {
    // File may already be gone; deletion must never fail the main operation.
  }
}
