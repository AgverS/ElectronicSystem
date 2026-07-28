import { cn } from "@/lib/utils";

/**
 * Фирменный знак: логотип колледжа бизнеса и права.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Колледж бизнеса и права"
      className={cn("size-7 object-contain", className)}
    />
  );
}
