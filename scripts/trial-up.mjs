#!/usr/bin/env node
/**
 * Durable local trial server: detaches from the parent shell/agent so Cursor
 * session end does not kill Next.js. Supervises with a restart loop.
 *
 * Usage: node scripts/trial-up.mjs   (or: pnpm trial:up)
 * Env: APP_SECRET, DATA_DIR (default ./data-trial), PORT (default 3847)
 */
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidfile = path.join(root, ".triad-trial.pid");
const logFile = path.join(root, ".triad-dev.log");
const port = process.env.PORT || "3847";
const appSecret = process.env.APP_SECRET || "local-trial-secret-do-not-use-prod";
const dataDir = process.env.DATA_DIR || "./data-trial";

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function portPids() {
  try {
    const raw = execFileSync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return raw
      ? raw
          .split(/\n/)
          .flatMap((line) => line.split(/\s+/))
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [];
  } catch {
    return [];
  }
}

if (fs.existsSync(pidfile)) {
  const existing = Number(fs.readFileSync(pidfile, "utf8").trim());
  if (Number.isFinite(existing) && isAlive(existing)) {
    console.log(`trial already up (supervisor pid ${existing})`);
    console.log(`log: ${logFile}`);
    console.log(`url: http://127.0.0.1:${port}`);
    process.exit(0);
  }
  fs.unlinkSync(pidfile);
}

const onPort = portPids();
if (onPort.length) {
  console.error(
    `port ${port} already in use by pid(s): ${onPort.join(", ")}. Run: pnpm trial:down`
  );
  process.exit(1);
}

console.log("building packages…");
execFileSync("pnpm", ["--filter", "@search-triad/connectors", "build"], {
  cwd: root,
  stdio: "inherit",
});
execFileSync("pnpm", ["--filter", "@search-triad/core", "build"], {
  cwd: root,
  stdio: "inherit",
});

const supervisePath = path.join(root, "scripts", "trial-supervise.mjs");
const logFd = fs.openSync(logFile, "a");

const child = spawn(process.execPath, [supervisePath], {
  cwd: root,
  detached: true,
  stdio: ["ignore", logFd, logFd],
  env: {
    ...process.env,
    APP_SECRET: appSecret,
    DATA_DIR: dataDir,
    PORT: port,
    TRIAD_TRIAL_ROOT: root,
  },
});

fs.writeFileSync(pidfile, String(child.pid) + "\n");
child.unref();

console.log(`trial supervisor started (pid ${child.pid})`);
console.log(`url: http://127.0.0.1:${port}  (bind 0.0.0.0:${port})`);
console.log(`DATA_DIR=${dataDir}`);
console.log(`log: ${logFile}`);
console.log(`pidfile: ${pidfile}`);
console.log("stop with: pnpm trial:down");
