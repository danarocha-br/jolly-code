import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";

type Supabase = SupabaseClient<Database>;

// Only snippets and animations have RPC functions implemented
type UsageLimitKind = "snippets" | "animations";
type PlanLimitKey = "maxSnippets" | "maxAnimations";

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
  lastResetAt?: string;
};

const RPC_MAP: Record<
  UsageLimitKind,
  {
    check: "check_snippet_limit" | "check_animation_limit";
    increment: "increment_snippet_count" | "increment_animation_count";
    decrement: "decrement_snippet_count" | "decrement_animation_count";
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
};

type LimitRpcName =
  | (typeof RPC_MAP)["snippets"]["check"]
  | (typeof RPC_MAP)["snippets"]["increment"]
  | (typeof RPC_MAP)["snippets"]["decrement"]
  | (typeof RPC_MAP)["animations"]["check"]
  | (typeof RPC_MAP)["animations"]["increment"]
  | (typeof RPC_MAP)["animations"]["decrement"];

const normalizeLimitPayload = (
  payload: any,
  kind: UsageLimitKind,
  fallbackPlan: PlanId = "free"
): UsageLimitCheck => {
  const plan = (payload?.plan as PlanId | undefined) ?? fallbackPlan;
  const planConfig = getPlanConfig(plan);
  const limitKey = RPC_MAP[kind].planKey;
  
  // Get default max from plan config
  let defaultMax: number | null;
  if (limitKey === "maxSnippets") {
    defaultMax = planConfig.maxSnippets === Infinity ? null : planConfig.maxSnippets;
  } else if (limitKey === "maxAnimations") {
    defaultMax = planConfig.maxAnimations === Infinity ? null : planConfig.maxAnimations;
  } else {
    defaultMax = planConfig.maxSlidesPerAnimation === Infinity ? null : planConfig.maxSlidesPerAnimation;
  }
  
  const max =
    payload?.max === null || typeof payload?.max === "undefined"
      ? defaultMax
      : Number(payload.max);

  return {
    canSave: Boolean(payload?.can_save ?? payload?.canSave ?? true),
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
  const { data, error } = await supabase.rpc(fn, { target_user_id: userId });

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
  return callLimitRpc(supabase, RPC_MAP[kind].decrement, userId, kind);
};

export const getUserUsage = async (supabase: Supabase, userId: string): Promise<UsageSummary> => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, snippet_count, animation_count")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Failed to load profile usage", profileError);
    throw new Error("Unable to load usage");
  }

  const { data: usage, error: usageError } = await supabase
    .from("usage_limits")
    .select("snippet_count, animation_count, last_reset_at")
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
  ] = await Promise.all([
    supabase.from("snippet").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("animation").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  if (snippetCountError) {
    console.error("Failed to count snippets for usage", snippetCountError);
  }
  if (animationCountError) {
    console.error("Failed to count animations for usage", animationCountError);
  }

  const plan = (profile.plan as PlanId | null) ?? "free";
  const planConfig = getPlanConfig(plan);
  const snippetCountFromLimits = usage?.snippet_count ?? profile.snippet_count ?? 0;
  const animationCountFromLimits = usage?.animation_count ?? profile.animation_count ?? 0;
  const snippetCount = Math.max(snippetCountFromLimits, actualSnippetCount ?? 0);
  const animationCount = Math.max(animationCountFromLimits, actualAnimationCount ?? 0);

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
