import path from "node:path";

export function dataDir() {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  const cwd = process.cwd();
  if (cwd.endsWith(`${path.sep}apps${path.sep}web`) || cwd.endsWith("/apps/web")) {
    return path.resolve(cwd, "../../data");
  }
  return path.resolve(cwd, "data");
}

export function dbPath() {
  return process.env.DATABASE_URL || path.join(dataDir(), "search-triad.sqlite");
}

export function secretsPath() {
  return path.join(dataDir(), "secrets.enc.json");
}
