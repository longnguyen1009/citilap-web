import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    // Phased HSTS rollout: 30 days initial without preload to avoid accidental subdomain bricking before verification
    value: process.env.HSTS_PRELOAD === "true"
      ? "max-age=63072000; includeSubDomains; preload"
      : "max-age=2592000",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://www.googletagmanager.com https://connect.facebook.net`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com https://media.citilap.vn https://i.ytimg.com https://bizweb.dktcdn.net https://www.googletagmanager.com https://*.google-analytics.com https://www.facebook.com",
      "font-src 'self' data:",
      "connect-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com",
      "frame-src 'self' https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.tiktok.com https://www.googletagmanager.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  experimental: {
    // Reuse prefetched / visited RSC payloads on the client so link clicks render instantly
    // instead of re-requesting the page (dynamic default is 0s = refetch on every click).
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "media.citilap.vn",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
