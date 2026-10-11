#!/usr/bin/env bash
# OSS helper: cold-ish tarball of ./data (or DATA_DIR).
# Does NOT include APP_SECRET — back that up separately.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${DATA_DIR:-$ROOT/data}"
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
ts="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"
if [[ ! -d "$DATA_DIR" ]]; then
  echo "No data dir at $DATA_DIR" >&2
  exit 1
fi
archive="$OUT_DIR/search-triad-data-$ts.tar.gz"
tar -czf "$archive" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
echo "Wrote $archive"
echo "Remember: restore needs the same APP_SECRET. See docs/ops/DATA-BACKUP.md"
