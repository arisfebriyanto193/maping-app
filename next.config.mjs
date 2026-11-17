/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/maping',
  trailingSlash: false,
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
