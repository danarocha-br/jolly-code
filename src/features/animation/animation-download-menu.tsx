"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import { calculateTotalDuration } from "@/features/animation";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { LoginDialog } from "@/features/login";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import { useUserUsage } from "@/features/user/queries";
import { getPlanConfig, type PlanId } from "@/lib/config/plans";
import { createClient } from "@/utils/supabase/client";
import { ExportOverlay } from "./share-dialog/export-overlay";
import { GifExporter } from "./gif-exporter";

export const AnimationDownloadMenu = () => {
  const user = useUserStore((state) => state.user);
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const totalDuration = useMemo(() => calculateTotalDuration(slides), [slides]);

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const showBackground = useEditorStore((state) => state.showBackground);

  const loadTimestampRef = useRef<number | null>(null);
  const firstExportTrackedRef = useRef(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cancelExport, setCancelExport] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentExportFormat, setCurrentExportFormat] = useState<"mp4" | "webm" | "gif">("mp4");
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<{
    current?: number;
    max?: number | null;
    plan?: PlanId;
  }>({});
  const supabase = useMemo(() => createClient(), []);
  const { data: usage } = useUserUsage(user?.id ?? undefined);

  const serializedSlides = useMemo(
    () =>
      slides.map((slide) => ({
        id: slide.id,
        code: slide.code,
        title: slide.title,
        language: slide.language,
        autoDetectLanguage: slide.autoDetectLanguage,
        duration: slide.duration,
      })),
    [slides]
  );

	// Track load timestamp
	useEffect(() => {
		if (!loadTimestampRef.current) {
			loadTimestampRef.current = Date.now();
		}
	}, []);

  const buildVideoLimitMessage = ({
    plan,
    current,
    max,
  }: {
    plan?: PlanId | null;
    current?: number | null;
    max?: number | null;
  }) => {
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

  const openUpgradeForVideoExports = (payload: { current?: number; max?: number | null; plan?: PlanId }) => {
    setUpgradeContext(payload);
    setIsUpgradeOpen(true);
  };

  const verifyVideoExportAllowance = async () => {
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
  };

  const handleExport = async (format: "mp4" | "webm" | "gif" = "mp4") => {
    if (!user) {
      setDropdownOpen(false);
      setIsLoginDialogOpen(true);
      trackAnimationEvent("guest_upgrade_prompted", user, {
        trigger: "download_animation",
      });
      return;
    }

    if (serializedSlides.length < 2) {
      toast.error("Add at least two slides to export.");
      return;
    }

    const allowed = await verifyVideoExportAllowance();
    if (!allowed) return;

    setCurrentExportFormat(format);
    setDropdownOpen(false);
    setIsExporting(true);
    setExportProgress(0);
    setCancelExport(false);
    const isFirstExport = !firstExportTrackedRef.current;
    if (isFirstExport) {
      firstExportTrackedRef.current = true;
    }
    trackAnimationEvent("export_started", user, {
      format: format,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      total_duration: totalDuration,
      transition_type: animationSettings.transitionType,
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
      time_to_first_export_ms:
        isFirstExport && loadTimestampRef.current !== null
          ? Date.now() - loadTimestampRef.current
          : undefined,
      source: "download_menu",
    });
  };

  const handleCancelExport = () => {
    setCancelExport(true);
    trackAnimationEvent("export_cancelled", user, {
      progress_percent: Math.round(exportProgress * 100),
      format: currentExportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
      source: "download_menu",
    });
  };

  const onExportComplete = async (blob: Blob) => {
    setIsExporting(false);
    setExportProgress(0);
    setCancelExport(false);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animation-${Date.now()}.${currentExportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    trackAnimationEvent("export_completed", user, {
      format: currentExportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      file_size_mb: Number((blob.size / (1024 * 1024)).toFixed(2)),
      duration_seconds: totalDuration,
      transition_type: animationSettings.transitionType,
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
      source: "download_menu",
    });

    if (user?.id) {
      const { error } = await supabase.rpc("increment_video_export_count", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error incrementing video export count:", error);
      }
    }

    toast.success(`${currentExportFormat.toUpperCase()} downloaded successfully.`);
  };

  const onExportError = async (err: Error) => {
    console.error(err);
    setIsExporting(false);
    setCancelExport(false);

    if (user?.id && exportProgress > 0) {
      // Defensive rollback if we ever incremented before failure (future-proofing).
      await supabase.rpc("decrement_video_export_count", {
        p_user_id: user.id,
      });
    }

    trackAnimationEvent("export_failed", user, {
      error_type: err?.message || "unknown",
      format: currentExportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      transition_type: animationSettings.transitionType,
      progress_percent: Math.round(exportProgress * 100),
      export_format_experiment: process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control",
      transition_experiment: process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control",
      source: "download_menu",
    });
    toast.error("Export failed. Please try again.");
  };

  return (
    <>
			<LoginDialog
				open={isLoginDialogOpen && !user}
				onOpenChange={setIsLoginDialogOpen}
				hideTrigger
			/>
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        limitType="videoExports"
        currentCount={upgradeContext.current}
        maxCount={upgradeContext.max}
        currentPlan={upgradeContext.plan}
      />

      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <Tooltip content="Download animation">
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="whitespace-nowrap">
              <i className="ri-download-line text-lg mr-2"></i>
              Download
            </Button>
          </DropdownMenuTrigger>
        </Tooltip>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("mp4")}>
            <i className="ri-video-line text-lg mr-2"></i>
            Download Video (MP4)
          </DropdownMenuItem>
          <DropdownMenuItem className="justify-start" onClick={() => handleExport("gif")}>
            <i className="ri-image-line text-lg mr-2"></i>
            Download as GIF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          {currentExportFormat === "gif" ? (
            <div className="relative">
              <div className="w-full max-w-md space-y-4 py-4 bg-card border rounded-xl shadow-lg">
                <div className="px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Generating GIF...</h3>
                    <span className="text-sm text-muted-foreground">{Math.round(exportProgress * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success transition-all duration-300 ease-out"
                      style={{ width: `${exportProgress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Please wait while we render your animation frame by frame.
                  </p>
                </div>
                <div className="flex justify-center border-t pt-2 -mb-2 px-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={handleCancelExport}
                    disabled={cancelExport}
                  >
                    {cancelExport ? "Cancelling..." : "Cancel export"}
                  </Button>
                </div>
              </div>
              <GifExporter
                slides={slides}
                settings={{ ...animationSettings, exportFormat: currentExportFormat }}
                editorSettings={{
                  backgroundTheme,
                  fontFamily,
                  fontSize,
                  showBackground,
                }}
                onProgress={setExportProgress}
                onComplete={onExportComplete}
                onError={onExportError}
                cancelled={cancelExport}
                onCancelled={() => {
                  setIsExporting(false);
                  setExportProgress(0);
                  setCancelExport(false);
                  toast("Export canceled.");
                }}
              />
            </div>
          ) : (
            <ExportOverlay
              progress={exportProgress}
              cancelExport={cancelExport}
              onCancel={handleCancelExport}
              slides={slides}
              settings={{ ...animationSettings, exportFormat: currentExportFormat }}
              editorSettings={{
                backgroundTheme,
                fontFamily,
                fontSize,
                showBackground,
              }}
              onProgress={setExportProgress}
              onComplete={onExportComplete}
              onError={onExportError}
              onCancelled={() => {
                setIsExporting(false);
                setExportProgress(0);
                setCancelExport(false);
                toast("Export canceled.");
              }}
            />
          )}
        </div>
      )}
    </>
  );
};
