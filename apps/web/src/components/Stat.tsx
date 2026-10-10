export function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function Delta({ value }: { value: number }) {
  const cls = value > 0 ? "delta-up" : value < 0 ? "delta-down" : "text-ink/50";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`font-mono text-sm ${cls}`}>
      {sign}
      {fmt(value)}
    </span>
  );
}

export function EngineBadge({ engine }: { engine: string }) {
  const color = engine === "gsc" ? "bg-gsc" : engine === "bing" ? "bg-bing" : "bg-yandex";
  const label = engine === "gsc" ? "Google" : engine === "bing" ? "Bing" : "Yandex";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`engine-dot ${color}`} />
      {label}
    </span>
  );
}

export function Sparkline({
  values,
  color = "var(--accent)",
}: {
  values: number[];
  color?: string;
}) {
  if (!values.length) return <div className="h-10 text-xs text-ink/40">No series</div>;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((v - min) / span) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-full">
      <polyline fill="none" stroke={color} strokeWidth="3" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
