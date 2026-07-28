import { cn } from "@/lib/utils";

/* Маленький спарклайн для KPI-плиток. Значения нормализуются в 0..1. */
export function Sparkline({
  points,
  tone = "muted",
  className,
}: {
  points: number[];
  tone?: "pos" | "neg" | "accent" | "muted";
  className?: string;
}) {
  const w = 92;
  const h = 34;
  const pad = 3;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const toneClass =
    tone === "pos"
      ? "text-emerald-500"
      : tone === "neg"
        ? "text-destructive"
        : tone === "accent"
          ? "text-primary"
          : "text-muted-foreground";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn(toneClass, className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}

/* График пропусков по неделям: площадь + линия. */
export function TrendChart({
  series,
  labels,
}: {
  series: number[];
  labels: string[];
}) {
  const w = 720;
  const h = 190;
  const max = Math.max(...series, 1);
  const step = series.length > 1 ? w / (series.length - 1) : 0;
  const pts = series.map((v, i) => {
    const x = i * step;
    const y = h - 12 - (h - 30) * (v / max);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <div>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block"
        aria-hidden
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={h * f} x2={w} y2={h * f} stroke="var(--border)" />
        ))}
        <path d={area} fill="url(#trend-fill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.length > 0 && (
          <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="var(--primary)" />
        )}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-muted-foreground">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/* Тепловая карта пропусков: группы × дни. Интенсивность — красный по alpha. */
export function AbsenceHeatmap({
  groups,
  days,
  matrix,
}: {
  groups: string[];
  days: string[];
  matrix: number[][];
}) {
  const max = Math.max(1, ...matrix.flat());
  const cols = `120px repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div>
      <div className="mt-3 grid items-center gap-[5px]" style={{ gridTemplateColumns: cols }}>
        <span />
        {days.map((d, i) => (
          <span key={i} className="text-center font-mono text-[10px] font-semibold text-muted-foreground/70">
            {d}
          </span>
        ))}
        {groups.map((g, r) => (
          <FragmentRow key={g} label={g} row={matrix[r] ?? []} max={max} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground/70">
        меньше
        <span className="flex gap-[3px]">
          {[0.08, 0.28, 0.5, 0.72, 0.92].map((a) => (
            <span
              key={a}
              className="h-2.5 w-4 rounded-[3px] ring-1 ring-foreground/5"
              style={{ background: `color-mix(in oklch, var(--destructive) ${Math.round(a * 100)}%, transparent)` }}
            />
          ))}
        </span>
        больше пропусков
      </div>
    </div>
  );
}

function FragmentRow({ label, row, max }: { label: string; row: number[]; max: number }) {
  return (
    <>
      <span className="truncate font-medium text-[12.5px] text-muted-foreground">{label}</span>
      {row.map((v, i) => {
        const a = v === 0 ? 0 : 0.12 + (v / max) * 0.78;
        return (
          <span
            key={i}
            title={`${label} · ${v} ${v === 1 ? "пропуск" : "пропусков"}`}
            className="grid h-[26px] place-items-center rounded-[6px] text-[11px] font-bold text-foreground/70"
            style={{ background: `color-mix(in oklch, var(--destructive) ${Math.round(a * 100)}%, transparent)` }}
          >
            {v > 0 ? v : ""}
          </span>
        );
      })}
    </>
  );
}
