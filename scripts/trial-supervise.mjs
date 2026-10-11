#!/usr/bin/env node
/**
 * Restart loop for trial Next.js dev. Started detached by trial-up.mjs.
 * Do not run this directly unless debugging.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root =
  process.env.TRIAD_TRIAL_ROOT ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function stamp(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function runOnce() {
  return new Promise((resolve) => {
    stamp("starting pnpm --filter @search-triad/web dev");
    const child = spawn(
      "pnpm",
      ["--filter", "@search-triad/web", "dev"],
      {
        cwd: root,
        env: process.env,
        stdio: "inherit",
      }
    );
    child.on("exit", (code, signal) => {
      stamp(`next exited code=${code} signal=${signal ?? ""}`);
      resolve(code ?? 1);
    });
  });
}

process.on("SIGTERM", () => {
  stamp("supervisor got SIGTERM; exiting");
  process.exit(0);
});
process.on("SIGINT", () => {
  stamp("supervisor got SIGINT; exiting");
  process.exit(0);
});

stamp(
  `supervisor online APP_SECRET set=${Boolean(process.env.APP_SECRET)} DATA_DIR=${process.env.DATA_DIR} PORT=${process.env.PORT}`
);

while (true) {
  await runOnce();
  stamp("restarting in 2s…");
  await new Promise((r) => setTimeout(r, 2000));
}
