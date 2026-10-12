import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Prisma-Client unverändert lassen: OpenNext passt ihn für Cloudflare Workers an.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // Next traced nur die Node-Variante von Prisma; der Cloudflare-Build braucht die workerd-Dateien
  // (wasm.js + Query-Compiler), siehe scripts/prisma-workerd.mjs.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/client/wasm.js",
      "./node_modules/.prisma/client/wasm-worker-loader.mjs",
      "./node_modules/.prisma/client/query_compiler_bg.js",
      "./node_modules/.prisma/client/query_compiler_bg.wasm",
      "./node_modules/@prisma/client/runtime/wasm-compiler-edge.js",
    ],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflare.com" },
      { protocol: "https", hostname: "**.cloudflarecdn.com" },
      { protocol: "https", hostname: "**.workers.dev" },
      { protocol: "https", hostname: "**.xumari-modz.com" },
      { protocol: "https", hostname: "**.xumarimodz.com" },
      { protocol: "https", hostname: "**.marsupilami-modz.com" },
      { protocol: "https", hostname: "**.marsupilamimodz.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-switch",
      "@radix-ui/react-avatar",
    ],
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        // Schriften, Icons und Bilder aus /public lange cachen.
        source: "/:all*(svg|png|jpg|jpeg|webp|avif|woff2|ico)",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

// `next dev` mit Cloudflare-Bindings (getCloudflareContext) aus wrangler.jsonc.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
