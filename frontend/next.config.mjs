/** @type {import('next').NextConfig} */
// BACKEND_URL default is also declared in src/lib/config.ts for server-side code.
// next.config.mjs runs outside the src/ module graph so it reads the env directly.
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://backend:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
