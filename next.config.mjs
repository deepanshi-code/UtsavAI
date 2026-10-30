/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets a check build (NEXT_DIST_DIR=.next-check) run without clobbering a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
