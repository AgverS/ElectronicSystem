import { cn } from "@/lib/utils";

/**
 * Brand mark for the demo institution: an open journal, drawn as two facing
 * pages. Inline so it needs no network request and picks up the accent colour
 * in both themes.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Electronic Journal"
      className={cn("size-7", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M7 9.5h6.8c1.2 0 2.2.9 2.2 2v11c0-1.1-1-2-2.2-2H7v-11Z"
        className="fill-primary-foreground"
        opacity="0.95"
      />
      <path
        d="M25 9.5h-6.8c-1.2 0-2.2.9-2.2 2v11c0-1.1 1-2 2.2-2H25v-11Z"
        className="fill-primary-foreground"
        opacity="0.7"
      />
      <path d="M16 11.5v11" className="stroke-primary" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
