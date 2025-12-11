"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

import { useUserUsage } from "@/features/user/queries";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";
import type { UsageSummary } from "@/lib/services/usage-limits";
import { createClient } from "@/utils/supabase/client";
import { trackAnimationEvent } from "@/features/animation/analytics";
import type { User } from "@supabase/supabase-js";

type UpgradeContext = {
  current?: number;
  max?: number | null;
  plan?: PlanId;
};

type ExportAnalyticsContext = {
  format?: "mp4" | "webm" | "gif";
  resolution?: string;
  slide_count?: number;
  total_duration?: number;
  transition_type?: string;
  progress_percent?: number;
  file_size_mb?: number;
  error_type?: string;
  time_to_first_export_ms?: number;
};

type UseVideoExportOptions = {
  user: User | null;
  onUpgradePrompt?: (context: UpgradeContext) => void;
};

export function useVideoExport({ user, onUpgradePrompt }: UseVideoExportOptions) {
  const supabase = useMemo(() => createClient(), []);
  const { data: usage } = useUserUsage(user?.id ?? undefined);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cancelExport, setCancelExport] = useState(false);

  // Track export lifecycle
  const exportCountIncrementedRef = useRef(false);

  const buildVideoLimitMessage = ({
    plan,
    current,
    max,
  }: {
    plan?: PlanId | null;
    current?: number | null;
    max?: number | null;
  }): string => {
    const safePlan = plan ?? "free";
    const planConfig = getPlanConfig(safePlan);
    const effectiveMax =
      typeof max === "number"
        ? max
        : planConfig.maxVideoExportCount === Infinity
          ? null
          : planConfig.maxVideoExportCount;

    if (!effectiveMax) {
      return "Video export limit reached. Please upgrade your plan.";
    }

    return `You've reached your video export limit (${Math.min(
      current ?? effectiveMax,
      effectiveMax
    )}/${effectiveMax}). Upgrade to continue exporting videos.`;
  };

  const openUpgradeForVideoExports = useCallback(
    (payload: UpgradeContext) => {
      onUpgradePrompt?.(payload);
    },
    [onUpgradePrompt]
  );

  const verifyAllowance = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    const plan = usage?.plan ?? "free";
    const current = usage?.videoExports?.current ?? 0;
    const max = usage?.videoExports?.max ?? getPlanConfig(plan).maxVideoExportCount ?? 0;

    if (max !== null && max <= 0) {
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "video_exports",
        trigger: "download_menu",
      });
      openUpgradeForVideoExports({ current, max, plan });
      return false;
    }

    // If we know the user already exhausted the limit from cached usage, prompt immediately.
    if (max !== null && current >= max) {
      trackAnimationEvent("limit_reached", user, {
        limit_type: "video_exports",
        current,
        max,
      });
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "video_exports",
        trigger: "download_menu",
      });
      openUpgradeForVideoExports({ current, max, plan });
      return false;
    }

    const { data, error } = await supabase.rpc("check_video_export_limit", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error checking video export limit:", error);
      // If the function is missing (404) or fails, fall back to local plan limits to avoid a silent bypass.
      if (max !== null && current >= max) {
        openUpgradeForVideoExports({ current, max, plan });
        return false;
      }
      toast.error("Unable to verify video export limit. Please try again.");
      return false;
    }

    const canExport = Boolean(data?.canExport ?? data?.can_export ?? false);
    const rpcPlan = (data?.plan as PlanId | undefined) ?? plan;
    const rpcCurrent = typeof data?.current === "number" ? data.current : current;
    const rpcMax =
      data?.max === null || typeof data?.max === "undefined" ? max : Number(data.max);

    if (!canExport) {
      trackAnimationEvent("export_blocked_limit", user, {
        limit: "video_exports",
        plan: rpcPlan,
        current: rpcCurrent,
        max: rpcMax,
        source: "download_menu",
      });
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "video_exports",
        trigger: "download_menu",
      });
      openUpgradeForVideoExports({ plan: rpcPlan, current: rpcCurrent, max: rpcMax });
      toast.error(buildVideoLimitMessage({ plan: rpcPlan, current: rpcCurrent, max: rpcMax }));
      return false;
    }

    return true;
  }, [user, usage, supabase, openUpgradeForVideoExports]);

  const incrementExportCount = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    const { error } = await supabase.rpc("increment_video_export_count", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error incrementing video export count:", error);
      return false;
    }

    exportCountIncrementedRef.current = true;
    return true;
  }, [user, supabase]);

  const decrementExportCount = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !exportCountIncrementedRef.current) return false;

    const { error } = await supabase.rpc("decrement_video_export_count", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error decrementing video export count:", error);
      return false;
    }

    exportCountIncrementedRef.current = false;
    return true;
  }, [user, supabase]);

  /**
   * Optimistically increments the export count and verifies the limit.
   * This performs an atomic increment before starting the export to prevent race conditions.
   * Returns true if increment succeeded and limit is still valid, false otherwise.
   * If increment succeeds but limit is exceeded, automatically decrements and returns false.
   */
  const incrementAndVerifyExportLimit = useCallback(async (): Promise<{
    success: boolean;
    context?: UpgradeContext;
  }> => {
    if (!user?.id) {
      return { success: false };
    }

    // Optimistically increment the count atomically
    const incrementSuccess = await incrementExportCount();
    if (!incrementSuccess) {
      return { success: false };
    }

    // After increment, verify we're still within limits
    const { data, error } = await supabase.rpc("check_video_export_limit", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error checking video export limit after increment:", error);
      // Rollback the increment on error
      await decrementExportCount();
      return { success: false };
    }

    const canExport = Boolean(data?.canExport ?? data?.can_export ?? false);
    const rpcPlan = (data?.plan as PlanId | undefined) ?? usage?.plan ?? "free";
    const rpcCurrent = typeof data?.current === "number" ? data.current : (usage?.videoExports?.current ?? 0);
    const rpcMax =
      data?.max === null || typeof data?.max === "undefined"
        ? usage?.videoExports?.max ?? getPlanConfig(rpcPlan).maxVideoExportCount ?? null
        : Number(data.max);

    // If we exceeded the limit after increment, rollback and fail
    if (!canExport) {
      await decrementExportCount();
      trackAnimationEvent("export_blocked_limit", user, {
        limit: "video_exports",
        plan: rpcPlan,
        current: rpcCurrent,
        max: rpcMax,
        source: "download_menu",
      });
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "video_exports",
        trigger: "download_menu",
      });
      return {
        success: false,
        context: { plan: rpcPlan, current: rpcCurrent, max: rpcMax },
      };
    }

    return { success: true };
  }, [user, usage, supabase, incrementExportCount, decrementExportCount]);

  const startExport = useCallback(
    (analyticsContext?: ExportAnalyticsContext) => {
      setIsExporting(true);
      setExportProgress(0);
      setCancelExport(false);
      // Note: exportCountIncrementedRef is already set to true by incrementAndVerifyExportLimit
      // before startExport is called, so we don't reset it here

      if (analyticsContext) {
        trackAnimationEvent("export_started", user, {
          format: analyticsContext.format,
          resolution: analyticsContext.resolution,
          slide_count: analyticsContext.slide_count,
          total_duration: analyticsContext.total_duration,
          transition_type: analyticsContext.transition_type,
          export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
          transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
          time_to_first_export_ms: analyticsContext.time_to_first_export_ms,
          source: "download_menu",
        });
      }
    },
    [user]
  );

  const cancelExportFn = useCallback(
    (analyticsContext?: ExportAnalyticsContext) => {
      setCancelExport(true);
      if (analyticsContext) {
        trackAnimationEvent("export_cancelled", user, {
          progress_percent: analyticsContext.progress_percent,
          format: analyticsContext.format,
          resolution: analyticsContext.resolution,
          slide_count: analyticsContext.slide_count,
          export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
          transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
          source: "download_menu",
        });
      }
    },
    [user]
  );

  const handleExportComplete = useCallback(
    async (blob: Blob, analyticsContext?: ExportAnalyticsContext) => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const format = analyticsContext?.format ?? "mp4";
        a.download = `animation-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (analyticsContext) {
          trackAnimationEvent("export_completed", user, {
            format: analyticsContext.format,
            resolution: analyticsContext.resolution,
            slide_count: analyticsContext.slide_count,
            file_size_mb: analyticsContext.file_size_mb,
            duration_seconds: analyticsContext.total_duration,
            transition_type: analyticsContext.transition_type,
            export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
            transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
            source: "download_menu",
          });
        }

        // Count was already incremented optimistically before export started
        // No need to increment again on completion

        toast.success(`${format.toUpperCase()} downloaded successfully.`);
      } finally {
        setIsExporting(false);
        setExportProgress(0);
        setCancelExport(false);
        // Reset the increment flag since export completed successfully
        exportCountIncrementedRef.current = false;
      }
    },
    [user]
  );

  const handleExportError = useCallback(
    async (err: Error, analyticsContext?: ExportAnalyticsContext) => {
      console.error(err);

      // Only decrement if we actually incremented the counter
      const decremented = await decrementExportCount();
      if (!decremented && exportCountIncrementedRef.current) {
        console.warn("Failed to decrement export count after error - count may be inflated");
      }

      if (analyticsContext) {
        trackAnimationEvent("export_failed", user, {
          error_type: err?.message || "unknown",
          format: analyticsContext.format,
          resolution: analyticsContext.resolution,
          slide_count: analyticsContext.slide_count,
          transition_type: analyticsContext.transition_type,
          progress_percent: analyticsContext.progress_percent,
          export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
          transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
          source: "download_menu",
        });
      }

      setIsExporting(false);
      setCancelExport(false);
      toast.error("Export failed. Please try again.");
    },
    [user, decrementExportCount]
  );

  const resetExport = useCallback(() => {
    setIsExporting(false);
    setExportProgress(0);
    setCancelExport(false);
    // Note: Don't reset exportCountIncrementedRef here - it's managed by
    // decrementExportCount or handleExportComplete
  }, []);

  return {
    verifyAllowance,
    startExport,
    cancelExportFn,
    handleExportComplete,
    handleExportError,
    incrementExportCount,
    incrementAndVerifyExportLimit,
    decrementExportCount,
    usage,
    isExporting,
    exportProgress,
    setExportProgress,
    cancelExport,
    resetExport,
  };
}

