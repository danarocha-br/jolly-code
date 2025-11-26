/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,OPTIONS,PATCH,DELETE,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
          },
        ],
      },
    ];
  },
  turbopack: {},
  sentry: {
    dsn:
      process.env.SENTRY_DSN ||
      process.env.NEXT_PUBLIC_SENTRY_DSN ||
      "https://0060b2873d00231ea23837f583d4d017@o4505998703984640.ingest.sentry.io/4505998710145024",
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    widenClientFileUpload: true,
    transpileClientSDK: true,
    sourceMapsUploadOptions: {
      org: "compasso-9c",
      project: "jolly-code",
    },
  },
};

export default nextConfig;
