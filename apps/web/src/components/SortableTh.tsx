"use client";

import type { ReactNode } from "react";

export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDir;
};

export function toggleSort<K extends string>(
  current: SortState<K>,
  nextKey: K,
  defaultDir: SortDir = "desc"
): SortState<K> {
  if (current.key === nextKey) {
    return { key: nextKey, dir: current.dir === "desc" ? "asc" : "desc" };
  }
  return { key: nextKey, dir: defaultDir };
}

export function compareSortValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  dir: SortDir
): number {
  const empty = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return empty;
  if (b == null) return -empty;

  let cmp = 0;
  if (typeof a === "number" && typeof b === "number") {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: "base", numeric: true });
  }
  return dir === "asc" ? cmp : -cmp;
}

export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  title,
  className = "",
}: {
  label: ReactNode;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  title?: string;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const arrow = active ? (sort.dir === "asc" ? "↑" : "↓") : null;

  return (
    <th className={`pb-2 font-medium ${className}`} title={title}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-0.5 text-left hover:text-ink ${
          active ? "text-ink" : "text-ink/55"
        }`}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{label}</span>
        {arrow && (
          <span className="font-mono text-[11px]" aria-hidden>
            {arrow}
          </span>
        )}
      </button>
    </th>
  );
}
