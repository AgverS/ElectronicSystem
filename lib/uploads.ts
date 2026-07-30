/**
 * Attachment storage for the demo.
 *
 * The full system writes uploaded files to a mounted volume and keeps only
 * metadata in the database. Here there is no server and no disk, so a file is
 * held as a data URL inside the visitor's own demo database — which means an
 * uploaded document never leaves their machine.
 *
 * Because that store is the browser's localStorage, attachments are capped well
 * below the real system's limit; anything larger is recorded by name alone.
 */

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

/** The limit the real system enforces, kept so validation behaves the same. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Above this, only the file's details are kept — browser storage is finite. */
export const MAX_INLINE_SIZE = 256 * 1024;

/** Marks an attachment recorded without its contents. */
export const METADATA_ONLY = "metadata-only";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function saveUpload(file: File): Promise<{ storageKey: string; size: number }> {
  if (file.size > MAX_INLINE_SIZE) {
    return { storageKey: METADATA_ONLY, size: file.size };
  }
  return { storageKey: await readAsDataUrl(file), size: file.size };
}

/** The stored data URL, or null when only metadata was kept. */
export function readUpload(storageKey: string): string | null {
  return storageKey === METADATA_ONLY ? null : storageKey;
}

 
export async function deleteUpload(_storageKey: string): Promise<void> {
  // Contents live inside the attachment row itself, so deleting the row is
  // enough. Kept as a no-op so callers read the same as in the full system.
}

/** Trigger a browser download for a stored attachment. */
export function downloadUpload(storageKey: string, fileName: string): boolean {
  const dataUrl = readUpload(storageKey);
  if (!dataUrl) return false;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
  return true;
}
