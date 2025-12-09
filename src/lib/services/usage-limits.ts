import type { SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/types/database";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";

type Supabase = SupabaseClient<Database>;

type UsageLimitKind = "snippets" | "animations" | "folders" | "publicShares" | "videoExports";
type PlanLimitKey =
  | "maxSnippets"
  | "maxAnimations"
  | "maxSnippetsFolder"
  | "shareAsPublicURL"
  | "maxVideoExportCount";

export type UsageLimitCheck = {
  canSave: boolean;
  current: number;
  max: number | null;
  plan: PlanId;
  overLimit?: number;
  error?: string;
};

export type UsageSummary = {
  plan: PlanId;
  snippets: {
    current: number;
    max: number | null;
    overLimit?: number;
  };
  animations: {
    current: number;
    max: number | null;
    overLimit?: number;
  };
  folders: {
    current: number;
    max: number | null;
  };
  videoExports: {
    current: number;
    max: number | null;
  };
  publicShares: {
    current: number;
    max: number | null;
  };
  lastResetAt?: string;
};

type UsageRpcPayload = {
  plan: PlanId | null;
  snippet_count?: number | null;
  animation_count?: number | null;
  folder_count?: number | null;
  video_export_count?: number | null;
  public_share_count?: number | null;
  last_reset_at?: string | null;
  over_limit_snippets?: number | null;
  over_limit_animations?: number | null;
};

const USER_USAGE_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_USAGE_RPC_BACKOFF_MS = 5 * 60 * 1000;
const USER_USAGE_RPC_NAME = "get_user_usage_v2";
const USER_USAGE_RPC_FALLBACK_NAME = "get_user_usage"; // Fallback to old function if v2 not available

const userUsageCache = new Map<
  string,
  {
    expiresAt: number;
    value: Promise<UsageSummary>;
  }
>();

let userUsageRpcBackoffUntil = 0;

const normalizeCount = (value: unknown): number => Number(value ?? 0);
const normalizeOverLimit = (value: unknown): number | null =>
  typeof value === "undefined" || value === null ? null : Number(value);

const buildUsageSummary = ({
  plan,
  planConfig,
  snippetCount,
  animationCount,
  folderCount,
  videoExportCount,
  publicShareCount,
  overLimitSnippets,
  overLimitAnimations,
  lastResetAt,
}: {
  plan: PlanId;
  planConfig: ReturnType<typeof getPlanConfig>;
  snippetCount: number;
  animationCount: number;
  folderCount: number;
  videoExportCount: number;
  publicShareCount: number;
  overLimitSnippets: number;
  overLimitAnimations: number;
  lastResetAt?: string | null;
}): UsageSummary => {
  return {
    plan,
    snippets: {
      current: snippetCount,
      max: planConfig.maxSnippets === Infinity ? null : planConfig.maxSnippets,
      overLimit: overLimitSnippets ?? 0,
    },
    animations: {
      current: animationCount,
      max: planConfig.maxAnimations === Infinity ? null : planConfig.maxAnimations,
      overLimit: overLimitAnimations ?? 0,
    },
    folders: {
      current: folderCount,
      max: planConfig.maxSnippetsFolder === Infinity ? null : planConfig.maxSnippetsFolder,
    },
    videoExports: {
      current: videoExportCount,
      max: planConfig.maxVideoExportCount === Infinity ? null : planConfig.maxVideoExportCount,
    },
    publicShares: {
      current: publicShareCount,
      max: planConfig.shareAsPublicURL === Infinity ? null : planConfig.shareAsPublicURL,
    },
    lastResetAt: lastResetAt ?? undefined,
  };
};

const getUserUsageFallback = async (
  supabase: Supabase,
  userId: string
): Promise<UsageSummary> => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Failed to load profile usage (fallback)", profileError);
    throw new Error("Unable to load usage");
  }

  const { data: usage, error: usageError } = await supabase
    .from("usage_limits")
    .select(
      "snippet_count, animation_count, folder_count, video_export_count, public_share_count, last_reset_at, over_limit_snippets, over_limit_animations"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (usageError && usageError.code !== "PGRST116") {
    console.error("Failed to load usage limits (fallback)", usageError);
    throw new Error("Unable to load usage");
  }

  const usageRow: any = usage ?? {};

  const [
    { count: actualSnippetCount, error: snippetCountError },
    { count: actualAnimationCount, error: animationCountError },
    { count: actualFolderCount, error: folderCountError },
    { count: actualAnimationFolderCount, error: animationFolderCountError },
  ] = await Promise.all([
    supabase.from("snippet").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("animation").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("collection").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("animation_collection")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (snippetCountError) {
    console.error("Failed to count snippets for usage (fallback)", snippetCountError);
  }
  if (animationCountError) {
    console.error("Failed to count animations for usage (fallback)", animationCountError);
  }
  if (folderCountError) {
    console.error("Failed to count snippet folders for usage (fallback)", folderCountError);
  }
  if (animationFolderCountError) {
    console.error("Failed to count animation folders for usage (fallback)", animationFolderCountError);
  }

  const plan = (profile.plan as PlanId | null) ?? "free";
  const planConfig = getPlanConfig(plan);

  const snippetCountFromLimits = usageRow.snippet_count ?? 0;
  const animationCountFromLimits = usageRow.animation_count ?? 0;
  const overLimitSnippets = usageRow.over_limit_snippets ?? null;
  const overLimitAnimations = usageRow.over_limit_animations ?? null;
  const folderCountFromLimits = usageRow.folder_count ?? 0;
  const videoExportCountFromLimits = usageRow.video_export_count ?? 0;
  const publicShareCountFromLimits = usageRow.public_share_count ?? 0;
  const snippetCount = Math.max(snippetCountFromLimits, actualSnippetCount ?? 0);
  const animationCount = Math.max(animationCountFromLimits, actualAnimationCount ?? 0);
  const folderCount = Math.max(
    folderCountFromLimits,
    (actualFolderCount ?? 0) + (actualAnimationFolderCount ?? 0)
  );
  const publicShareCount = publicShareCountFromLimits;
  const computedSnippetOverLimit =
    overLimitSnippets ??
    (planConfig.maxSnippets === Infinity
      ? 0
      : Math.max(snippetCount - (planConfig.maxSnippets ?? 0), 0));
  const computedAnimationOverLimit =
    overLimitAnimations ??
    (planConfig.maxAnimations === Infinity
      ? 0
      : Math.max(animationCount - (planConfig.maxAnimations ?? 0), 0));

  return buildUsageSummary({
    plan,
    planConfig,
    snippetCount,
    animationCount,
    folderCount,
    videoExportCount: videoExportCountFromLimits,
    publicShareCount,
    overLimitSnippets: computedSnippetOverLimit ?? 0,
    overLimitAnimations: computedAnimationOverLimit ?? 0,
    lastResetAt: usageRow.last_reset_at,
  });
};

const RPC_MAP: Record<
  UsageLimitKind,
  {
    check:
    | "check_snippet_limit"
    | "check_animation_limit"
    | "check_folder_limit"
    | "check_public_share_limit"
    | "check_video_export_limit";
    increment:
    | "increment_snippet_count"
    | "increment_animation_count"
    | "increment_folder_count"
    | "increment_video_export_count"
    | "increment_public_share_count";
    decrement?:
    | "decrement_snippet_count"
    | "decrement_animation_count"
    | "decrement_folder_count"
    | "decrement_public_share_count"
    | "decrement_video_export_count";
    planKey: PlanLimitKey;
  }
> = {
  snippets: {
    check: "check_snippet_limit",
    increment: "increment_snippet_count",
    decrement: "decrement_snippet_count",
    planKey: "maxSnippets",
  },
  animations: {
    check: "check_animation_limit",
    increment: "increment_animation_count",
    decrement: "decrement_animation_count",
    planKey: "maxAnimations",
  },
  folders: {
    check: "check_folder_limit",
    increment: "increment_folder_count",
    decrement: "decrement_folder_count",
    planKey: "maxSnippetsFolder",
  },
  videoExports: {
    check: "check_video_export_limit",
    increment: "increment_video_export_count",
    decrement: "decrement_video_export_count",
    planKey: "maxVideoExportCount",
  },
  publicShares: {
    check: "check_public_share_limit",
    increment: "increment_public_share_count",
    decrement: "decrement_public_share_count",
    planKey: "shareAsPublicURL",
  },
};

type LimitRpcName =
  | (typeof RPC_MAP)["snippets"]["check"]
  | (typeof RPC_MAP)["snippets"]["increment"]
  | (typeof RPC_MAP)["snippets"]["decrement"]
  | (typeof RPC_MAP)["animations"]["check"]
  | (typeof RPC_MAP)["animations"]["increment"]
  | (typeof RPC_MAP)["animations"]["decrement"]
  | (typeof RPC_MAP)["folders"]["check"]
  | (typeof RPC_MAP)["folders"]["increment"]
  | (typeof RPC_MAP)["folders"]["decrement"]
  | (typeof RPC_MAP)["videoExports"]["check"]
  | (typeof RPC_MAP)["videoExports"]["increment"]
  | (typeof RPC_MAP)["videoExports"]["decrement"]
  | (typeof RPC_MAP)["publicShares"]["check"]
  | (typeof RPC_MAP)["publicShares"]["increment"]
  | (typeof RPC_MAP)["publicShares"]["decrement"];

const normalizeLimitPayload = (
  payload: any,
  kind: UsageLimitKind,
  fallbackPlan: PlanId = "free"
): UsageLimitCheck => {
  const plan = (payload?.plan as PlanId | undefined) ?? fallbackPlan;
  const planConfig = getPlanConfig(plan);
  const limitKey = RPC_MAP[kind].planKey;

  const defaultMax =
    limitKey === "maxSnippets"
      ? planConfig.maxSnippets === Infinity ? null : planConfig.maxSnippets
      : limitKey === "maxAnimations"
        ? planConfig.maxAnimations === Infinity ? null : planConfig.maxAnimations
        : limitKey === "maxSnippetsFolder"
          ? planConfig.maxSnippetsFolder === Infinity ? null : planConfig.maxSnippetsFolder
          : planConfig.shareAsPublicURL === Infinity ? null : planConfig.shareAsPublicURL;

  const max =
    payload?.max === null || typeof payload?.max === "undefined"
      ? defaultMax
      : Number(payload.max);

  const overLimit =
    typeof payload?.over_limit !== "undefined"
      ? Number(payload.over_limit)
      : typeof payload?.overLimit !== "undefined"
        ? Number(payload.overLimit)
        : 0;

  return {
    canSave: Boolean(
      payload?.can_save ??
      payload?.canSave ??
      payload?.can_export ??
      payload?.canExport ??
      payload?.can_create ??
      payload?.canCreate ??
      true
    ),
    current: Number(payload?.current ?? 0),
    max,
    plan,
    overLimit,
    error: payload?.error as string | undefined,
  };
};

const callLimitRpc = async (
  supabase: Supabase,
  fn: LimitRpcName,
  userId: string,
  kind: UsageLimitKind
): Promise<UsageLimitCheck> => {
  const { data, error } = await supabase.rpc(fn as any, { p_user_id: userId });

  if (error) {
    console.error(`RPC ${fn} failed`, error);
    throw new Error(`Usage limit check failed`);
  }

  return normalizeLimitPayload(data, kind);
};

export const checkSnippetLimit = async (
  supabase: Supabase,
  userId: string
): Promise<UsageLimitCheck> => {
  return callLimitRpc(supabase, RPC_MAP.snippets.check, userId, "snippets");
};

export const checkAnimationLimit = async (
  supabase: Supabase,
  userId: string
): Promise<UsageLimitCheck> => {
  return callLimitRpc(supabase, RPC_MAP.animations.check, userId, "animations");
};

export const checkVideoExportLimit = async (
  supabase: Supabase,
  userId: string
): Promise<UsageLimitCheck> => {
  return callLimitRpc(supabase, RPC_MAP.videoExports.check, userId, "videoExports");
};

export const checkPublicShareLimit = async (
  supabase: Supabase,
  userId: string
): Promise<UsageLimitCheck> => {
  return callLimitRpc(supabase, RPC_MAP.publicShares.check, userId, "publicShares");
};

export const checkFolderLimit = async (
  supabase: Supabase,
  userId: string
): Promise<UsageLimitCheck> => {
  return callLimitRpc(supabase, RPC_MAP.folders.check, userId, "folders");
};

export const incrementUsageCount = async (
  supabase: Supabase,
  userId: string,
  kind: UsageLimitKind
): Promise<UsageLimitCheck> => {
  const result = await callLimitRpc(supabase, RPC_MAP[kind].increment, userId, kind);
  if (result.error === "limit_reached") {
    return { ...result, canSave: false };
  }
  return result;
};

export const decrementUsageCount = async (
  supabase: Supabase,
  userId: string,
  kind: UsageLimitKind
): Promise<UsageLimitCheck> => {
  const decrementFn = RPC_MAP[kind].decrement;
  if (!decrementFn) {
    throw new Error(`No decrement RPC configured for usage kind: ${kind}`);
  }
  return callLimitRpc(supabase, decrementFn, userId, kind);
};

export const getUserUsage = async (supabase: Supabase, userId: string): Promise<UsageSummary> => {
  const cached = userUsageCache.get(userId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const usagePromise = (async (): Promise<UsageSummary> => {
    const nowInner = Date.now();
    const shouldSkipRpc = userUsageRpcBackoffUntil > nowInner;

    if (shouldSkipRpc) {
      return getUserUsageFallback(supabase, userId);
    }

    // Try the new v2 function first
    let { data, error } = await supabase.rpc(USER_USAGE_RPC_NAME, { p_user_id: userId });

    // If v2 returns 404, try the fallback function (get_user_usage)
    if (error || !data) {
      const isNotFound =
        (typeof error?.code === "string" &&
          (error.code === "404" ||
            error.code === "PGRST302" ||
            error.message?.toLowerCase().includes("not found"))) ||
        (typeof (error as any)?.status === "number" && (error as any).status === 404);

      if (isNotFound) {
        // Report 404 errors to Sentry as they indicate a deployment/configuration issue
        const errorMessage = `RPC function ${USER_USAGE_RPC_NAME} not found (404)`;
        console.warn("[getUserUsage] RPC function v2 not found, trying fallback:", {
          rpc_name: USER_USAGE_RPC_NAME,
          fallback_rpc: USER_USAGE_RPC_FALLBACK_NAME,
          error_code: error?.code,
          error_message: error?.message,
          user_id: userId,
        });

        // Use withScope to ensure proper context
        if (typeof window !== "undefined") {
          // Client-side: use withScope and flush
          Sentry.withScope((scope) => {
            scope.setLevel("warning"); // Warning since we have a fallback
            scope.setTag("rpc_function", USER_USAGE_RPC_NAME);
            scope.setTag("error_type", "rpc_not_found_fallback");
            scope.setTag("user_id", userId);
            scope.setContext("rpc_error", {
              rpc_name: USER_USAGE_RPC_NAME,
              fallback_rpc: USER_USAGE_RPC_FALLBACK_NAME,
              error_code: error?.code,
              error_message: error?.message,
              error_details: error,
            });
            scope.setExtra("error_code", error?.code);
            scope.setExtra("error_message", error?.message);
            scope.setExtra("fallback_rpc", USER_USAGE_RPC_FALLBACK_NAME);

            const notFoundError = new Error(errorMessage);
            notFoundError.name = "RPCNotFoundError";
            Sentry.captureException(notFoundError);

            // Flush to ensure event is sent immediately on client-side
            Sentry.flush(2000).catch((flushError) => {
              console.warn("[getUserUsage] Sentry flush failed:", flushError);
            });
          });
        } else {
          // Server-side: simpler capture
          Sentry.captureException(new Error(errorMessage), {
            level: "warning", // Warning since we have a fallback
            tags: {
              rpc_function: USER_USAGE_RPC_NAME,
              error_type: "rpc_not_found_fallback",
              user_id: userId,
            },
            extra: {
              error_code: error?.code,
              error_message: error?.message,
              error_details: error,
              fallback_rpc: USER_USAGE_RPC_FALLBACK_NAME,
            },
          });
        }

        // Try the fallback function (get_user_usage) which should be available
        const fallbackResult = await supabase.rpc(USER_USAGE_RPC_FALLBACK_NAME, { p_user_id: userId });
        
        if (fallbackResult.error || !fallbackResult.data) {
          // Both functions failed, use the full fallback method
          console.error("[getUserUsage] Both RPC functions failed, using full fallback method");
          userUsageRpcBackoffUntil = Date.now() + USER_USAGE_RPC_BACKOFF_MS;
          return getUserUsageFallback(supabase, userId);
        }

        // Fallback function worked, use its data
        data = fallbackResult.data;
        error = null;
      }
    }

    // If we still have an error (non-404), handle it
    if (error || !data) {

      // Report other RPC errors to Sentry
      const rpcError = error instanceof Error ? error : new Error("RPC call failed");
      console.error("[getUserUsage] RPC call failed:", {
        rpc_name: USER_USAGE_RPC_NAME,
        error_code: error?.code,
        error_message: error?.message,
        error_details: error,
        user_id: userId,
      });

      if (typeof window !== "undefined") {
        // Client-side: use withScope and flush
        Sentry.withScope((scope) => {
          scope.setLevel("error");
          scope.setTag("rpc_function", USER_USAGE_RPC_NAME);
          scope.setTag("error_type", "rpc_error");
          scope.setTag("user_id", userId);
          scope.setContext("rpc_error", {
            rpc_name: USER_USAGE_RPC_NAME,
            error_code: error?.code,
            error_message: error?.message,
            error_details: error,
          });
          scope.setExtra("error_code", error?.code);
          scope.setExtra("error_message", error?.message);
          scope.setExtra("error_details", error);

          Sentry.captureException(rpcError);

          // Flush to ensure event is sent immediately on client-side
          Sentry.flush(2000).catch((flushError) => {
            console.warn("[getUserUsage] Sentry flush failed:", flushError);
          });
        });
      } else {
        // Server-side: simpler capture
        Sentry.captureException(rpcError, {
          level: "error",
          tags: {
            rpc_function: USER_USAGE_RPC_NAME,
            error_type: "rpc_error",
            user_id: userId,
          },
          extra: {
            error_code: error?.code,
            error_message: error?.message,
            error_details: error,
          },
        });
      }

      console.error("Failed to load usage via RPC", error);
      throw new Error("Unable to load usage");
    }

    const usagePayload = data as UsageRpcPayload;
    const plan = usagePayload.plan ?? "free";
    const planConfig = getPlanConfig(plan);

    const snippetCount = normalizeCount(usagePayload.snippet_count);
    const animationCount = normalizeCount(usagePayload.animation_count);
    const folderCount = normalizeCount(usagePayload.folder_count);
    const videoExportCount = normalizeCount(usagePayload.video_export_count);
    const publicShareCount = normalizeCount(usagePayload.public_share_count);
    const overLimitSnippets = normalizeOverLimit(usagePayload.over_limit_snippets);
    const overLimitAnimations = normalizeOverLimit(usagePayload.over_limit_animations);
    const computedSnippetOverLimit =
      overLimitSnippets !== null
        ? overLimitSnippets
        : planConfig.maxSnippets === Infinity
          ? 0
          : Math.max(snippetCount - (planConfig.maxSnippets ?? 0), 0);
    const computedAnimationOverLimit =
      overLimitAnimations !== null
        ? overLimitAnimations
        : planConfig.maxAnimations === Infinity
          ? 0
          : Math.max(animationCount - (planConfig.maxAnimations ?? 0), 0);

    return buildUsageSummary({
      plan,
      planConfig,
      snippetCount,
      animationCount,
      folderCount,
      videoExportCount,
      publicShareCount,
      overLimitSnippets: computedSnippetOverLimit ?? 0,
      overLimitAnimations: computedAnimationOverLimit ?? 0,
      lastResetAt: usagePayload.last_reset_at,
    });
  })();

  userUsageCache.set(userId, { expiresAt: now + USER_USAGE_CACHE_TTL_MS, value: usagePromise });

  usagePromise.catch(() => {
    userUsageCache.delete(userId);
  });

  return usagePromise;
};

export const checkSlideLimit = (slideCount: number, plan: PlanId): UsageLimitCheck => {
  const planConfig = getPlanConfig(plan);
  const max = planConfig.maxSlidesPerAnimation === Infinity ? null : planConfig.maxSlidesPerAnimation;
  return {
    canSave: max === null ? true : slideCount <= max,
    current: slideCount,
    max,
    plan,
  };
};
