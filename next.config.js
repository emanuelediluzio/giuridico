/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /test\/.*\.js$/,
      use: 'null-loader'
    });
    return config;
  }
};

module.exports = nextConfig; 