import type { NextConfig } from "next";

// Static export for GitHub Pages (BYOK edition — no server, visitors bring
// their own OpenAI-compatible API key). Served at aliceljy.github.io/copium/
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/copium",
  trailingSlash: true,
};

export default nextConfig;
