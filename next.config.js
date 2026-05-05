const { withBlitz } = require("@blitzjs/next")

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  serverExternalPackages: ["secure-password", "sodium-native", "node-gyp-build"],
}

module.exports = withBlitz(nextConfig)
