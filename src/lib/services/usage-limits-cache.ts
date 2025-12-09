import type { UsageSummary } from "./usage-limits";

/**
 * Abstract interface for cache and backoff storage.
 * Provides a way to store usage cache entries and RPC backoff timestamps
 * in a way that works across different runtime environments.
 */
export interface UsageLimitsCacheProvider {
  /**
   * Get a cached usage summary for a user.
   * @param userId - The user ID
   * @returns The cached promise if available and not expired, null otherwise
   */
  get(userId: string): Promise<UsageSummary> | null;

  /**
   * Set a cached usage summary for a user.
   * @param userId - The user ID
   * @param value - The promise that resolves to the usage summary
   * @param expiresAt - Timestamp when the cache entry expires
   */
  set(userId: string, value: Promise<UsageSummary>, expiresAt: number): void;

  /**
   * Delete a cached entry for a user.
   * @param userId - The user ID
   */
  delete(userId: string): void;

  /**
   * Get the current RPC backoff timestamp.
   * @returns The timestamp until which RPC calls should be skipped, or 0 if no backoff
   */
  getBackoffUntil(): number;

  /**
   * Set the RPC backoff timestamp.
   * @param timestamp - The timestamp until which RPC calls should be skipped
   */
  setBackoffUntil(timestamp: number): void;
}

/**
 * In-memory cache provider for client-side or long-lived server runtimes.
 * Uses Map for cache storage and a simple variable for backoff.
 */
export class InMemoryUsageLimitsCacheProvider implements UsageLimitsCacheProvider {
  private cache = new Map<
    string,
    {
      expiresAt: number;
      value: Promise<UsageSummary>;
    }
  >();
  private backoffUntil = 0;

  get(userId: string): Promise<UsageSummary> | null {
    const cached = this.cache.get(userId);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    return null;
  }

  set(userId: string, value: Promise<UsageSummary>, expiresAt: number): void {
    this.cache.set(userId, { expiresAt, value });

    // Clean up on error
    value.catch(() => {
      this.cache.delete(userId);
    });
  }

  delete(userId: string): void {
    this.cache.delete(userId);
  }

  getBackoffUntil(): number {
    return this.backoffUntil;
  }

  setBackoffUntil(timestamp: number): void {
    this.backoffUntil = timestamp;
  }
}

/**
 * No-op cache provider for serverless environments (Server Actions, API routes).
 * Disables caching and backoff since module state won't persist across invocations.
 */
export class NoOpUsageLimitsCacheProvider implements UsageLimitsCacheProvider {
  get(_userId: string): Promise<UsageSummary> | null {
    return null;
  }

  set(_userId: string, _value: Promise<UsageSummary>, _expiresAt: number): void {
    // No-op: caching disabled in serverless environments
  }

  delete(_userId: string): void {
    // No-op
  }

  getBackoffUntil(): number {
    return 0; // No backoff in serverless environments
  }

  setBackoffUntil(_timestamp: number): void {
    // No-op: backoff disabled in serverless environments
  }
}

/**
 * Detects the runtime environment and returns an appropriate cache provider.
 * - Client-side (browser): InMemoryUsageLimitsCacheProvider
 * - Server Actions / Serverless: NoOpUsageLimitsCacheProvider
 * - Long-lived server runtime: InMemoryUsageLimitsCacheProvider
 */
export function createUsageLimitsCacheProvider(): UsageLimitsCacheProvider {
  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    return new InMemoryUsageLimitsCacheProvider();
  }

  // Check if we're in a Server Action context by looking for Next.js server action markers
  // Server Actions run in serverless functions where module state doesn't persist
  // We detect this by checking for process.env.VERCEL or other serverless indicators
  const isServerless =
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_TARGET ||
    // Next.js Server Actions run in edge/serverless runtime
    (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "nodejs");

  if (isServerless) {
    return new NoOpUsageLimitsCacheProvider();
  }

  // Default to in-memory for long-lived server processes
  return new InMemoryUsageLimitsCacheProvider();
}

/**
 * Global cache provider instance.
 * Automatically selects the appropriate implementation based on runtime.
 */
let globalCacheProvider: UsageLimitsCacheProvider | null = null;

/**
 * Gets or creates the global cache provider instance.
 * This function ensures we use the same provider instance within a module execution context.
 */
export function getUsageLimitsCacheProvider(): UsageLimitsCacheProvider {
  if (!globalCacheProvider) {
    globalCacheProvider = createUsageLimitsCacheProvider();
  }
  return globalCacheProvider;
}

/**
 * Resets the global cache provider (useful for testing or explicit re-initialization).
 */
export function resetUsageLimitsCacheProvider(): void {
  globalCacheProvider = null;
}

