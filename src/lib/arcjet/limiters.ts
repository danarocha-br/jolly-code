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

// Track which limiters require user.id for safer checking
const LIMITERS_REQUIRING_USER_ID = new WeakSet<ArcjetInstance>();

// Mark limiters that require user.id
if (authedLimiter) LIMITERS_REQUIRING_USER_ID.add(authedLimiter);
if (strictLimiter) LIMITERS_REQUIRING_USER_ID.add(strictLimiter);

export async function enforceRateLimit(
  limiter: ArcjetInstance | null,
  req: Request,
  options?: { requested?: number; userId?: string; tags?: string[] },
) {
  if (!limiter) return null;

  // Check if this limiter requires user.id
  const requiresUserId = LIMITERS_REQUIRING_USER_ID.has(limiter);

  // Validate and normalize userId
  const rawUserId = options?.userId;
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
  const hasValidUserId = userId.length > 0;

  // If limiter requires user.id but userId is not provided or empty, skip rate limiting
  // This prevents Arcjet errors about missing required characteristics
  if (requiresUserId) {
    if (!hasValidUserId) {
      console.warn(
        "Rate limiter requires user.id but userId is missing or empty. Skipping rate limit check.",
        { userId: rawUserId, hasValidUserId },
      );
      return null;
    }
  }

  // Build protect options - NEVER include user if it's empty/undefined
  const protectOptions: {
    requested: number;
    user?: string;
    tags?: string[];
  } = {
    requested: options?.requested ?? 1,
    tags: options?.tags,
  };

  // Only pass user if we have a valid, non-empty userId
  // This is critical - Arcjet will error if user.id characteristic is required but user is empty
  if (hasValidUserId) {
    protectOptions.user = userId;
  } else if (requiresUserId) {
    // Double-check: if limiter requires user.id but we don't have it, don't call protect
    console.warn(
      "Rate limiter requires user.id but userId is invalid. Skipping protect call.",
    );
    return null;
  }

  try {
    const decision = await (limiter as any).protect(req, protectOptions);

    if (decision.isDenied()) {
      const status = decision.reason.isRateLimit() ? 429 : 403;
      const message = decision.reason.isRateLimit() ? "Too many requests" : "Forbidden";
      return NextResponse.json({ error: message }, { status });
    }

    return null;
  } catch (error: any) {
    // Catch any Arcjet errors related to missing user.id
    if (error?.message?.includes("user.id") || error?.message?.includes("characteristic")) {
      console.error("Arcjet error with user.id characteristic:", error.message);
      // Return null to allow the request to proceed without rate limiting
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}
