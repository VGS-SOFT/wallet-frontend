/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    /**
     * remotePatterns replaces deprecated `domains` config.
     * More secure — allows path/protocol scoping per domain.
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
