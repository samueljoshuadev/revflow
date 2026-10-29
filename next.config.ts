import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // O deploy no VPS (deploy/deploy.sh) precisa do build standalone. A Vercel
  // monta a saída de servidor por conta própria e seu passo onBuildComplete
  // procura .next/next-server.js.nft.json, que o modo standalone não emite,
  // então ali o output volta ao padrão.
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
