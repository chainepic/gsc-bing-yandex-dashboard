# Backup and migrate `./data` (self-host)

Your encrypted secrets, SQLite DB, and digests live under **`DATA_DIR`** (Compose default: `./data` on the host → `/data` in the container).

This is an **OSS** ops doc. No Chainepic account required.

## What to back up

| Path | Contents |
| --- | --- |
| `DATA_DIR/*.sqlite*` | Metrics, sites, digests, recommendations state |
| `DATA_DIR/` other files | App-managed state (keep the whole directory) |
| `.env` / Compose env | `APP_SECRET`, optional `PANEL_PASSWORD` — **store separately and privately** |

**Critical:** Restoring SQLite without the **same `APP_SECRET`** makes stored OAuth/API secrets unreadable. Back up `APP_SECRET` with the same discipline as production keys.

## Cold backup (panel stopped)

```bash
# From the repo root (Docker Compose layout)
docker compose stop

ts=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
tar -czf "backups/search-triad-data-$ts.tar.gz" data

# Keep APP_SECRET outside the tarball (password manager / sealed note)
docker compose start
```

## Live backup (panel running)

SQLite may be in WAL mode. Prefer stop for clean backups. If you must copy live:

```bash
# Best effort — still prefer compose stop for restores you care about
cp -a data "backups/data-live-$(date +%Y%m%d-%H%M%S)"
```

Or use `sqlite3 data/search-triad.sqlite ".backup backups/search-triad.sqlite"` when the CLI is available against the same file the app uses.

## Restore

```bash
docker compose stop
# Move aside the broken tree
mv data "data.broken-$(date +%Y%m%d)"
mkdir data
tar -xzf backups/search-triad-data-YYYYMMDD-HHMMSS.tar.gz
# Ensure APP_SECRET in .env matches the backup era
docker compose start
curl -sS http://127.0.0.1:3847/api/health
```

## Migrate to another machine

1. On source: cold tar of `data/` + copy `APP_SECRET` (and panel password if set).  
2. On target: install Compose stack, set the **same** `APP_SECRET`, extract `data/` to `./data`.  
3. `docker compose up -d` → open Setup/Settings only if engines need re-auth (usually not, if secret matches).

## Not covered

- Chainepic Cloud backups (commercial track)  
- Cross-region replication  

See [DUAL-TRACK.md](../DUAL-TRACK.md) if you are looking for hosted backup as a product.
