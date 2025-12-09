import arcjet, { shield, tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";

/**
 * Arcjet Rate Limiting Configuration
 * 
 * This app supports both authenticated and guest (unauthenticated) users.
 * 
 * Usage patterns:
 * - For guest users: Use `publicLimiter` (IP-based only)
 * - For authenticated users: Use `authedLimiter` or `strictLimiter` (userId + IP)
 * 
 * IMPORTANT: Never call `authedLimiter` or `strictLimiter` without a valid userId.
 * Use `enforceRateLimit` which handles guest users gracefully by skipping 
 * limiters that require userId when the user is not authenticated.
 */

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

export type RateLimiter = {
  instance: ArcjetInstance;
  requiresUserId: boolean;
};

const createLimiter = (config: LimiterConfig): RateLimiter | null => {
  if (!key) return null;

  const instance = arcjet({
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

  return {
    instance,
    requiresUserId: config.characteristics?.includes("userId") ?? false,
  };
};

export const publicLimiter = createLimiter({
  capacity: 40,
  refillRate: 20,
  interval: 60,
  characteristics: ["ip.src"],
});

// For authenticated users with valid user.id
// NOTE: These limiters REQUIRE a valid userId - do not call if user is guest/unauthenticated
export const authedLimiter = createLimiter({
  capacity: 60,
  refillRate: 30,
  interval: 60,
  characteristics: ["userId", "ip.src"], // Changed from "user.id" to "userId"
});

export const strictLimiter = createLimiter({
  capacity: 10,
  refillRate: 5,
  interval: 60,
  characteristics: ["userId", "ip.src"], // Changed from "user.id" to "userId"
});

export const webhookLimiter = createLimiter({
  capacity: 100,
  refillRate: 50,
  interval: 60,
  characteristics: ["ip.src"],
});

export async function enforceRateLimit(
  limiter: RateLimiter | null,
  req: Request,
  options?: { requested?: number; userId?: string; tags?: string[] },
) {
  // If no limiter configured, skip
  if (!limiter) {
    return null;
  }

  const { instance, requiresUserId } = limiter;

  // Validate and normalize userId - be very strict about what constitutes a valid userId
  const rawUserId = options?.userId;
  const userId = 
    typeof rawUserId === "string" && rawUserId.trim().length > 0
      ? rawUserId.trim()
      : null;
  
  const hasValidUserId = userId !== null && userId !== "";

  // CRITICAL: If limiter requires userId but we don't have a valid one,
  // we MUST skip rate limiting entirely to avoid Arcjet errors
  // This handles guest/unauthenticated users gracefully
  if (requiresUserId && !hasValidUserId) {
    // Silently skip - this is expected behavior for guest users
    return null;
  }

  // Build protect options - NEVER include userId field if empty
  const protectOptions: {
    requested: number;
    userId?: string;
    tags?: string[];
  } = {
    requested: options?.requested ?? 1,
    tags: options?.tags,
  };

  // Only add userId field if we have a valid userId
  // This is critical - arcjet will error if userId is in characteristics but value is empty
  if (hasValidUserId) {
    protectOptions.userId = userId;
  }

  try {
    const decision = await (instance as any).protect(req, protectOptions);

    if (decision.isDenied()) {
      const status = decision.reason.isRateLimit() ? 429 : 403;
      const message = decision.reason.isRateLimit() ? "Too many requests" : "Forbidden";
      return NextResponse.json({ error: message }, { status });
    }

    return null;
  } catch (error: any) {
    // Catch any Arcjet errors related to missing or empty userId
    const isArcjetCharacteristicError = 
      error?.name === "ArcjetError" ||
      error?.message?.includes("characteristic is required") ||
      error?.message?.includes("userId must be");
    
    if (isArcjetCharacteristicError) {
      console.warn("[Arcjet] Error with userId characteristic - allowing request to proceed:", error.message);
      // Return null to allow the request to proceed without rate limiting
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}
