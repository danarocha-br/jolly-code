import arcjet, { shield, tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";

type LimiterConfig = {
  capacity: number;
  refillRate: number;
  interval: number;
  characteristics?: string[];
  mode?: "LIVE" | "DRY_RUN";
};

const key = process.env.ARCJET_KEY;

if (!key) {
  // Fail fast so we don't silently run without protection in prod.
  console.warn("ARCJET_KEY is not set; rate limiting will be skipped.");
}

const baseShield = shield({ mode: process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN" });

type ArcjetInstance = ReturnType<typeof arcjet>;

const createLimiter = (config: LimiterConfig): ArcjetInstance | null => {
  if (!key) return null;

  return arcjet({
    key,
    rules: [
      baseShield,
      tokenBucket({
        mode: config.mode ?? (process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN"),
        characteristics: config.characteristics ?? ["ip.src"],
        capacity: config.capacity,
        refillRate: config.refillRate,
        interval: config.interval,
      }),
    ],
  });
};

export const publicLimiter = createLimiter({
  capacity: 40,
  refillRate: 20,
  interval: 60,
  characteristics: ["ip.src"],
});

export const authedLimiter = createLimiter({
  capacity: 60,
  refillRate: 30,
  interval: 60,
  characteristics: ["user.id", "ip.src"],
});

export const strictLimiter = createLimiter({
  capacity: 10,
  refillRate: 5,
  interval: 60,
  characteristics: ["user.id", "ip.src"],
});

export const webhookLimiter = createLimiter({
  capacity: 100,
  refillRate: 50,
  interval: 60,
  characteristics: ["ip.src"],
});

export async function enforceRateLimit(
  limiter: ArcjetInstance | null,
  req: Request,
  options?: { requested?: number; userId?: string; tags?: string[] },
) {
  if (!limiter) return null;

  const decision = await (limiter as any).protect(req, {
    requested: options?.requested ?? 1,
    user: options?.userId,
    tags: options?.tags,
  });

  if (decision.isDenied()) {
    const status = decision.reason.isRateLimit() ? 429 : 403;
    const message = decision.reason.isRateLimit() ? "Too many requests" : "Forbidden";
    return NextResponse.json({ error: message }, { status });
  }

  return null;
}
