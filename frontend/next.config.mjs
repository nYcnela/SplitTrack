const backendInternalUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:8080").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendInternalUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendInternalUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
