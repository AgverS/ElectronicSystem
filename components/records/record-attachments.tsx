import { IconFileTypePdf, IconPaperclip } from "@tabler/icons-react";

export interface AttachmentInfo {
  id: string;
  fileName: string;
  mimeType: string;
}

function attachmentHref(id: string) {
  return `/api/student-records/attachments/${id}`;
}

// Plain markup with no hooks so it renders in both server and client trees.
export function RecordAttachments({ attachments }: { attachments: AttachmentInfo[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a) => {
        const href = attachmentHref(a.id);
        const isImage = a.mimeType.startsWith("image/");

        if (isImage) {
          return (
            <a
              key={a.id}
              href={href}
              target="_blank"
              rel="noreferrer"
              title={a.fileName}
              className="block h-12 w-12 overflow-hidden rounded border transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={href} alt={a.fileName} className="h-full w-full object-cover" />
            </a>
          );
        }

        const isPdf = a.mimeType === "application/pdf";
        const Icon = isPdf ? IconFileTypePdf : IconPaperclip;
        return (
          <a
            key={a.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={a.fileName}
            className="inline-flex max-w-48 items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon size={14} className="shrink-0" />
            <span className="truncate">{a.fileName}</span>
          </a>
        );
      })}
    </div>
  );
}
