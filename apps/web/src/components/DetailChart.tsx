"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { fmt, pct } from "@/components/Stat";

export type ChartPoint = {
  date: string;
  clicks: number;
  impressions: number;
};

function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (max <= min) return [Math.max(0, Math.round(min))];
  const span = max - min;
  const raw = span / Math.max(count - 1, 1);
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  const step = candidates.find((s) => s >= raw) ?? candidates[candidates.length - 1]!;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 0.5; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
    if (ticks.length > 8) break;
  }
  return ticks.length ? ticks : [0, Math.round(max)];
}

function shortDate(iso: string) {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[1]}-${m[2]}`;
}

export function DetailChart({
  points,
  color = "var(--accent)",
  height = 220,
  metric = "clicks",
  showAxes = true,
  interactive = true,
}: {
  points: ChartPoint[];
  color?: string;
  height?: number;
  metric?: "clicks" | "impressions";
  showAxes?: boolean;
  interactive?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const layout = useMemo(() => {
    const padL = showAxes ? 44 : 4;
    const padR = 12;
    const padT = 12;
    const padB = showAxes ? 28 : 4;
    const w = 640;
    const h = height;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const values = points.map((p) => (metric === "clicks" ? p.clicks : p.impressions));
    const rawMax = Math.max(...values, 1);
    const rawMin = Math.min(...values, 0);
    const yTicks = niceTicks(rawMin, rawMax, 5);
    const yMin = yTicks[0] ?? 0;
    const yMax = yTicks[yTicks.length - 1] ?? rawMax;
    const ySpan = Math.max(yMax - yMin, 1);

    const xAt = (i: number) =>
      padL + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yAt = (v: number) => padT + innerH - ((v - yMin) / ySpan) * innerH;

    const linePts = values
      .map((v, i) => `${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`)
      .join(" ");

    const areaPts =
      values.length > 0
        ? `${xAt(0).toFixed(2)},${(padT + innerH).toFixed(2)} ${linePts} ${xAt(values.length - 1).toFixed(2)},${(padT + innerH).toFixed(2)}`
        : "";

    const xLabelCount =
      points.length <= 1 ? 1 : points.length <= 10 ? points.length : Math.min(7, points.length);
    const xLabelIdx =
      points.length <= 1
        ? [0]
        : Array.from({ length: xLabelCount }, (_, k) =>
            Math.round((k / Math.max(xLabelCount - 1, 1)) * (points.length - 1))
          ).filter((v, i, a) => a.indexOf(v) === i);

    return { w, h, padL, padR, padT, padB, innerW, innerH, yTicks, yMin, yMax, xAt, yAt, linePts, areaPts, xLabelIdx, values };
  }, [points, metric, height, showAxes]);

  if (!points.length) {
    return <div className="text-xs text-ink/40">No series</div>;
  }

  const active = hover != null ? points[hover] : null;
  const activeVal = hover != null ? layout.values[hover] : null;

  function onMove(e: MouseEvent<SVGSVGElement>) {
    if (!interactive || points.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * layout.w;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(layout.xAt(i) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHover(best);
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="h-auto w-full"
        style={{ height }}
        role="img"
        aria-label={`${metric} trend`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {showAxes &&
          layout.yTicks.map((tick) => {
            const y = layout.yAt(tick);
            return (
              <g key={`y-${tick}`}>
                <line
                  x1={layout.padL}
                  x2={layout.w - layout.padR}
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeOpacity={0.55}
                  strokeWidth={1}
                />
                <text
                  x={layout.padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="currentColor"
                  opacity={0.55}
                  fontFamily="var(--font-mono)"
                >
                  {fmt(tick)}
                </text>
              </g>
            );
          })}

        {layout.areaPts ? (
          <polygon fill={color} fillOpacity={0.12} points={layout.areaPts} />
        ) : null}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2.25}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={layout.linePts}
        />

        {showAxes &&
          layout.xLabelIdx.map((i) => {
            const p = points[i];
            if (!p) return null;
            return (
              <text
                key={`x-${p.date}`}
                x={layout.xAt(i)}
                y={layout.h - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize={10}
                fill="currentColor"
                opacity={0.55}
                fontFamily="var(--font-mono)"
              >
                {shortDate(p.date)}
              </text>
            );
          })}

        {interactive && hover != null && activeVal != null ? (
          <g>
            <line
              x1={layout.xAt(hover)}
              x2={layout.xAt(hover)}
              y1={layout.padT}
              y2={layout.padT + layout.innerH}
              stroke="var(--ink)"
              strokeOpacity={0.25}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={layout.xAt(hover)}
              cy={layout.yAt(activeVal)}
              r={4}
              fill={color}
              stroke="var(--paper)"
              strokeWidth={1.5}
            />
          </g>
        ) : null}
      </svg>

      {interactive && active && activeVal != null ? (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 border border-line bg-paper px-2.5 py-1.5 font-mono text-xs shadow-sm">
          <div className="text-ink/55">{active.date}</div>
          <div>
            {fmt(active.clicks)} clicks · {fmt(active.impressions)} impr ·{" "}
            {pct(active.impressions > 0 ? active.clicks / active.impressions : 0)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
