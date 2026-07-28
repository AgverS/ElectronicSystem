import type { NextConfig } from "next";

/**
 * The demo is a fully static export: no server, no database, nothing to
 * configure. It can be dropped on any static host, and every visitor gets their
 * own copy of the data in their own browser.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Set when serving from a subpath (e.g. GitHub Pages project sites).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
