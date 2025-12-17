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
import type { PlanId } from "@/lib/config/plans";
import { ExportOverlay } from "./share-dialog/export-overlay";
import { GifExporter } from "./gif-exporter";
import { useVideoExport } from "./hooks/use-video-export";
import { useWatermarkVisibility } from "./hooks/use-watermark-visibility";

export const AnimationDownloadMenu = () => {
  const user = useUserStore((state) => state.user);
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const totalDuration = useMemo(() => calculateTotalDuration(slides), [slides]);

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const showBackground = useEditorStore((state) => state.showBackground);

  // Check if watermark should be hidden
  const { shouldShowWatermark } = useWatermarkVisibility(user?.id);
  const hideWatermark = !shouldShowWatermark;

  const loadTimestampRef = useRef<number | null>(null);
  const firstExportTrackedRef = useRef(false);

  // UI state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentExportFormat, setCurrentExportFormat] = useState<"mp4" | "webm" | "gif">("mp4");
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeContext, setUpgradeContext] = useState<{
    current?: number;
    max?: number | null;
    plan?: PlanId;
  }>({});

  const {
    verifyAllowance,
    startExport,
    cancelExportFn,
    handleExportComplete,
    handleExportError,
    incrementAndVerifyExportLimit,
    decrementExportCount,
    isExporting,
    exportProgress,
    setExportProgress,
    cancelExport,
    resetExport,
  } = useVideoExport({
    user,
    onUpgradePrompt: (context) => {
      setUpgradeContext(context);
      setIsUpgradeOpen(true);
    },
  });

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

    // Perform optimistic atomic increment before starting export to prevent race conditions
    const incrementResult = await incrementAndVerifyExportLimit();
    if (!incrementResult.success) {
      // If increment failed or limit exceeded, show upgrade prompt if context provided
      if (incrementResult.context) {
        setUpgradeContext(incrementResult.context);
        setIsUpgradeOpen(true);
        toast.error(
          `You've reached your video export limit (${incrementResult.context.current}/${incrementResult.context.max}). Upgrade to continue exporting videos.`
        );
      } else {
        toast.error("Unable to start export. Please try again.");
      }
      return;
    }

    // Increment succeeded and limit is valid, proceed with export
    setCurrentExportFormat(format);
    setDropdownOpen(false);

    const isFirstExport = !firstExportTrackedRef.current;
    if (isFirstExport) {
      firstExportTrackedRef.current = true;
    }

    try {
      startExport({
        format,
        resolution: animationSettings.resolution,
        slide_count: serializedSlides.length,
        total_duration: totalDuration,
        transition_type: animationSettings.transitionType,
        time_to_first_export_ms:
          isFirstExport && loadTimestampRef.current !== null
            ? Date.now() - loadTimestampRef.current
            : undefined,
      });
    } catch (error) {
      // If starting export fails, rollback the optimistic increment
      await decrementExportCount();
      resetExport();
      toast.error("Failed to start export. Please try again.");
      console.error("Error starting export:", error);
    }
  };

  const handleCancelExport = () => {
    cancelExportFn({
      progress_percent: Math.round(exportProgress * 100),
      format: currentExportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
    });
  };

  const onExportComplete = async (blob: Blob) => {
    await handleExportComplete(blob, {
      format: currentExportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      file_size_mb: Number((blob.size / (1024 * 1024)).toFixed(2)),
      total_duration: totalDuration,
      transition_type: animationSettings.transitionType,
    });
  };

  const onExportError = async (err: Error) => {
    await handleExportError(err, {
      format: currentExportFormat,
      resolution: animationSettings.resolution,
      slide_count: serializedSlides.length,
      transition_type: animationSettings.transitionType,
      progress_percent: Math.round(exportProgress * 100),
    });
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
                onCancelled={async () => {
                  // Rollback the optimistic increment since export was cancelled
                  await decrementExportCount();
                  resetExport();
                  toast("Export canceled.");
                }}
                hideWatermark={hideWatermark}
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
              onCancelled={async () => {
                // Rollback the optimistic increment since export was cancelled
                await decrementExportCount();
                resetExport();
                toast("Export canceled.");
              }}
              hideWatermark={hideWatermark}
            />
          )}
        </div>
      )}
    </>
  );
};
