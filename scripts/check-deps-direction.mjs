#!/usr/bin/env node
/**
 * Fail if MIT packages import commercial/ (dependency direction gate).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenRoots = [
  path.join(root, "packages/core"),
  path.join(root, "packages/connectors"),
  path.join(root, "packages/adapters-oss"),
  path.join(root, "apps/web/src"),
];

const BAD = [
  /from\s+["'][^"']*commercial[^"']*["']/,
  /require\(["'][^"']*commercial[^"']*["']\)/,
  /@search-triad\/commercial/,
  /from\s+["'][^"']*\/commercial\//,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".next") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

let bad = 0;
for (const dir of forbiddenRoots) {
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of BAD) {
      if (re.test(text)) {
        console.error(`dependency-direction: ${path.relative(root, file)} matches ${re}`);
        bad++;
      }
    }
  }
}

if (bad) {
  console.error(`\n${bad} violation(s): MIT code must not import commercial/.`);
  process.exit(1);
}
console.log("dependency-direction: ok (no commercial imports in MIT packages)");
