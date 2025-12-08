import type { SupabaseClient } from "@supabase/supabase-js";

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
  error?: string;
};

export type UsageSummary = {
  plan: PlanId;
  snippets: {
    current: number;
    max: number | null;
  };
  animations: {
    current: number;
    max: number | null;
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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Failed to load profile usage", profileError);
    throw new Error("Unable to load usage");
  }

  const { data: usage, error: usageError } = await supabase
    .from("usage_limits")
    .select(
      "snippet_count, animation_count, folder_count, video_export_count, public_share_count, last_reset_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (usageError && usageError.code !== "PGRST116") {
    console.error("Failed to load usage limits", usageError);
    throw new Error("Unable to load usage");
  }

  // Reconcile against actual table counts to avoid stale counters in usage_limits/profiles
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
    console.error("Failed to count snippets for usage", snippetCountError);
  }
  if (animationCountError) {
    console.error("Failed to count animations for usage", animationCountError);
  }
  if (folderCountError) {
    console.error("Failed to count snippet folders for usage", folderCountError);
  }
  if (animationFolderCountError) {
    console.error("Failed to count animation folders for usage", animationFolderCountError);
  }

  const plan = (profile.plan as PlanId | null) ?? "free";
  const planConfig = getPlanConfig(plan);
  const snippetCountFromLimits = usage?.snippet_count ?? 0;
  const animationCountFromLimits = usage?.animation_count ?? 0;
  const folderCountFromLimits = usage?.folder_count ?? 0;
  const videoExportCountFromLimits = usage?.video_export_count ?? 0;
  const publicShareCountFromLimits = usage?.public_share_count ?? 0;
  const snippetCount = Math.max(snippetCountFromLimits, actualSnippetCount ?? 0);
  const animationCount = Math.max(animationCountFromLimits, actualAnimationCount ?? 0);
  const folderCount = Math.max(
    folderCountFromLimits,
    (actualFolderCount ?? 0) + (actualAnimationFolderCount ?? 0)
  );
  const publicShareCount = publicShareCountFromLimits;

  return {
    plan,
    snippets: {
      current: snippetCount,
      max: planConfig.maxSnippets === Infinity ? null : planConfig.maxSnippets,
    },
    animations: {
      current: animationCount,
      max: planConfig.maxAnimations === Infinity ? null : planConfig.maxAnimations,
    },
    folders: {
      current: folderCount,
      max: planConfig.maxSnippetsFolder === Infinity ? null : planConfig.maxSnippetsFolder,
    },
    videoExports: {
      current: videoExportCountFromLimits,
      max: planConfig.maxVideoExportCount === Infinity ? null : planConfig.maxVideoExportCount,
    },
    publicShares: {
      current: publicShareCount,
      max: planConfig.shareAsPublicURL === Infinity ? null : planConfig.shareAsPublicURL,
    },
    lastResetAt: usage?.last_reset_at ?? undefined,
  };
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
