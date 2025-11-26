import type { Options } from "@sentry/nextjs";

const parseRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
const tracesSampleRate = parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 1);
const profilesSampleRate = parseRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, tracesSampleRate);

const envPropagationTargets = process.env.SENTRY_TRACE_PROPAGATION_TARGETS
  ?.split(",")
  .map((target) => target.trim())
  .filter(Boolean);

const tracePropagationTargets =
  envPropagationTargets && envPropagationTargets.length > 0
    ? envPropagationTargets
    : ["localhost", /^https:\/\/jolly-code\.dev\/api/];

const release =
  process.env.SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

const isProduction = environment === "production";
const isStaging = environment === "staging";

const replaysSessionSampleRate = isProduction ? 0 : isStaging ? 0.2 : 0.1;
const replaysOnErrorSampleRate = isProduction ? 0.1 : 1.0;

export const sentrySharedConfig: Options = {
  dsn: process.env.SENTRY_DSN,
  environment,
  release,
  tracesSampleRate,
  profilesSampleRate,
  tracePropagationTargets,
  debug: false,
};

export const replaySampleRates = {
  replaysSessionSampleRate,
  replaysOnErrorSampleRate,
};
