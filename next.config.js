/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // Riabilitato StrictMode
  // La sezione webpack è stata rimossa
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    return config;
  },
};

module.exports = nextConfig; 