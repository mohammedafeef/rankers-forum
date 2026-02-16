import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // async redirects() {
  //   return [
  //     {
  //       source: '/:path((?!^$|\\/$))*',
  //       destination: '/',
  //       permanent: true,
  //     },
  //   ];
  // },
  async rewrites() {
    return [
      {
        source: '/:path((?!^$).*)',
        destination: '/',
      },
    ];
  },
};

export default nextConfig;
