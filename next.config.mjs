import {withSentryConfig} from "@sentry/nextjs";
// import { FlytrapTransformPlugin } from "useflytrap/transform";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode: true,

  // webpack(config) {
  //   config.plugins = config.plugins ?? [];
  //   config.plugins.push(FlytrapTransformPlugin.webpack());
  //   return config;
  // },
};


export default withSentryConfig(nextConfig, {
// For all available options, see:
// https://github.com/getsentry/sentry-webpack-plugin#options

// Suppresses source map uploading logs during build
silent: true,
org: "compasso-9c",
project: "jolly-code",
}, {
// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

widenClientFileUpload: true,

transpileClientSDK: true,

// Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
tunnelRoute: "/monitoring",

hideSourceMaps: true,

disableLogger: true,
});