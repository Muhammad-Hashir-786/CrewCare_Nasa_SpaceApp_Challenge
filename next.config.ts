import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack requires native bindings not available on this platform.
  // Webpack is used for both dev and build.
  // Keep API smoke-test builds separate from the developer's active Next server.
  distDir: process.env.CREWCARE_NEXT_DIST_DIR ?? (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
};

export default nextConfig;
