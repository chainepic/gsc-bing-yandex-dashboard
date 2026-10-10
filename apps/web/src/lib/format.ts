export function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
