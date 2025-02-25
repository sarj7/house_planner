/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack configuration to provide fallbacks for certain Node modules in the browser.
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
  // Using CDN URLs so custom images configuration is not needed.
}

module.exports = nextConfig
