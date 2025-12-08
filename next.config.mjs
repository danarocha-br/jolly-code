import "./src/env.mjs";
import { withSentryConfig } from '@sentry/nextjs';

const appOrigin =
  process.env.CORS_ALLOWED_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // Public oEmbed endpoint remains open for external consumers
      // Must be defined before the catch-all /api/:path* pattern
      {
        source: "/api/oembed",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
      // Public share visit tracking for embeds
      // Must be defined before the catch-all /api/:path* pattern
      {
        source: "/api/save-shared-url-visits",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
      // Default API CORS: lock to configured origin for authenticated/private APIs
      // This catch-all pattern must come after specific routes
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: appOrigin },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
      {
        source: "/animate/embed/:slug",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
    ];
  },
  turbopack: {},
};

export default withSentryConfig(nextConfig, {
  org: 'compasso-9c',
  project: 'jolly-code',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
