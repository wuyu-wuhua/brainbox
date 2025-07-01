/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve-file/:path*',
      },
    ];
  },
  images: {
    domains: [
      'dashscope-result-bj.oss-cn-beijing.aliyuncs.com',
      'dashscope-result-wlcb-acdr-1.oss-cn-wulanchabu-acdr-1.aliyuncs.com',
      'localhost',
    ],
    unoptimized: true,
  },
};

module.exports = nextConfig; 