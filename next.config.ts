import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads its own WebAssembly files, and the migrations are read when the app starts.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
};

export default nextConfig;
