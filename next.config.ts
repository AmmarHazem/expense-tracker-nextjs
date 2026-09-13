import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf bundles a serverless build of pdf.js; keep it external so Next doesn't
  // try to bundle it into the server output.
  serverExternalPackages: ["unpdf"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
