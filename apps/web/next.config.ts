import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "googleapis", "@search-triad/connectors", "@search-triad/core"],
};

export default nextConfig;
