import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    // Emit a self-contained server bundle for Docker / Helm self-hosting.
    // The OpenNext (Cloudflare) build path ignores this and continues to
    // work because it consumes `.next/` directly.
    output: "standalone",
    reactCompiler: true,
    // When the local dev server is exposed via a Cloudflare tunnel for
    // remote testing (legal.dashable.dev), Next blocks HMR + RSC fetches
    // from that origin by default — the page never finishes hydrating.
    // Whitelist the tunneled host so dev works end-to-end through the
    // public URL.
    allowedDevOrigins: ["legal.dashable.dev", "legal-api.dashable.dev"],
    async rewrites() {
        return [
            {
                source: "/sitemap.xml",
                destination: "/api/sitemap/sitemap.xml",
            },
            {
                source: "/sitemap_:slug.xml",
                destination: "/api/sitemap/sitemap_:slug.xml",
            },
        ];
    },
    skipTrailingSlashRedirect: true,
};

export default nextConfig;
