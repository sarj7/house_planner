/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      dns: false,
      tls: false,
      fs: false,
      request: false,
    };
    return config;
  },
  images: {
    domains: ['cdnjs.cloudflare.com', 'unpkg.com'],
  },
}

module.exports = nextConfig
