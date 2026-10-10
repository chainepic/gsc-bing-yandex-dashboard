#!/usr/bin/env node
/** Thin wrapper → apps/web smoke via tsx. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const r = spawnSync(
  "pnpm",
  ["--filter", "@search-triad/web", "exec", "tsx", "scripts/smoke-auth.ts"],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(r.status ?? 1);
