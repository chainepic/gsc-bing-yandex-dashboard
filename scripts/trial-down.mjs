#!/usr/bin/env node
/**
 * Stop the durable trial supervisor and anything listening on PORT (default 3847).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidfile = path.join(root, ".triad-trial.pid");
const port = process.env.PORT || "3847";

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killTree(pid, signal = "SIGTERM") {
  try {
    // Kill process group if supervisor was detached with its own group
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      /* already gone */
    }
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

let stopped = false;

if (fs.existsSync(pidfile)) {
  const pid = Number(fs.readFileSync(pidfile, "utf8").trim());
  if (Number.isFinite(pid) && isAlive(pid)) {
    console.log(`stopping supervisor pid ${pid}`);
    killTree(pid, "SIGTERM");
    stopped = true;
    for (let i = 0; i < 20 && isAlive(pid); i++) {
      try {
        execFileSync("sleep", ["0.1"]);
      } catch {
        /* ignore */
      }
    }
    if (isAlive(pid)) {
      killTree(pid, "SIGKILL");
    }
  }
  try {
    fs.unlinkSync(pidfile);
  } catch {
    /* ignore */
  }
}

// Also clear orphan next listeners on the trial port
for (const pid of portPids()) {
  console.log(`killing listener on :${port} pid ${pid}`);
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    /* ignore */
  }
  stopped = true;
}

// Best-effort: match next/pnpm leftovers for this port
try {
  execFileSync("pkill", ["-f", `next dev --hostname 0.0.0.0 --port ${port}`], {
    stdio: "ignore",
  });
  stopped = true;
} catch {
  /* none */
}

console.log(stopped ? "trial stopped" : "trial was not running");
