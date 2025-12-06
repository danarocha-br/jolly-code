"use client";

import { useState } from "react";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

import { useUserUsage } from "@/features/user/queries";
import { getPlanLimitValue } from "@/lib/config/plans";
import { trackAnimationEvent } from "@/features/animation/analytics";

type AnimationLimitType = "animations" | "slides";

type UseAnimationLimitsProps = {
  user: User | null;
  slidesCount: number;
};

export function useAnimationLimits({ user, slidesCount }: UseAnimationLimitsProps) {
  const user_id = user?.id;
  const { data: usage } = useUserUsage(user_id);

  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<{
    type: AnimationLimitType;
    current?: number;
    max?: number | null;
  }>({ type: "animations" });

  const animationLimit = usage?.animations;
  const animationLimitReached =
    animationLimit?.max !== null &&
    typeof animationLimit?.max !== "undefined" &&
    animationLimit.current >= animationLimit.max;

  const plan = usage?.plan ?? "free";
  const slideLimitMax = getPlanLimitValue(plan, "maxSlidesPerAnimation");

  // NOTE: This checks if LIMIT IS EXCEEDED for creating new ones 
  // (e.g. if limit is 5, and we have 5, we can't create 6th)
  // For slides, we check if current count > limit when saving

  const checkSaveLimits = (): boolean => {
    // 1. Check Animation Limit
    if (animationLimitReached && animationLimit) {
      toast.error(
        `You've reached the free plan limit (${animationLimit.current}/${animationLimit.max} animations). Upgrade to Pro for unlimited animations!`
      );
      trackAnimationEvent("limit_reached", user, {
        limit_type: "animations",
        current: animationLimit.current,
        max: animationLimit.max ?? null,
      });
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "animations",
        trigger: "save_attempt",
      });
      setUpgradeContext({
        type: "animations",
        current: animationLimit.current,
        max: animationLimit.max ?? null,
      });
      setIsUpgradeOpen(true);
      return false;
    }

    // 2. Check Slide Limit
    if (slideLimitMax !== null && slidesCount > slideLimitMax) {
      toast.error(
        `Free users can add up to ${slideLimitMax} slides per animation. Upgrade to Pro for unlimited slides!`
      );
      trackAnimationEvent("limit_reached", user, {
        limit_type: "slides",
        current: slidesCount,
        max: slideLimitMax,
      });
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "slides",
        trigger: "save_attempt",
      });
      setUpgradeContext({
        type: "slides",
        current: slidesCount,
        max: slideLimitMax,
      });
      setIsUpgradeOpen(true);
      return false;
    }

    return true;
  };

  const handleSlideLimitReached = (payload: { current: number; max?: number | null }) => {
    trackAnimationEvent("slide_limit_blocked", user, {
      limit_type: "slides",
      current: payload.current,
      max: payload.max ?? slideLimitMax,
    });
    trackAnimationEvent("upgrade_prompt_shown", user, {
      limit_type: "slides",
      trigger: "timeline",
    });
    setUpgradeContext({
      type: "slides",
      current: payload.current,
      max: payload.max ?? slideLimitMax ?? null,
    });
    setIsUpgradeOpen(true);
  };

  return {
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeContext,
    checkSaveLimits,
    handleSlideLimitReached,
    animationLimit,
    slideLimitMax,
    animationLimitReached,
  };
}
