"use client";
import { useState, useRef } from "react";
import { Room } from "../room";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { UserTools } from "@/features/user-tools";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Timeline,
  UnifiedAnimationCanvas,
  AnimationControls,
  useAnimationController,
  exportAnimation,
  downloadBlob,
  calculateTotalDuration,
} from "@/features/animation";
import { useAnimationStore, useEditorStore } from "@/app/store";
import { analytics } from "@/lib/services/tracking";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";

export default function AnimatePage() {
  const {
    currentFrame,
    progress,
    isPlaying,
    handlePlayPause,
    handleReset,
    slides,
  } = useAnimationController();

  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const [isExporting, setIsExporting] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const previewRef = useRef<HTMLDivElement>(null);

  // Get editor theme and font settings
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);

  const totalDuration = calculateTotalDuration(slides);
  const canExport = slides.length >= 2 && totalDuration <= 15;

  const toggleMode = () => {
    const newMode = mode === "edit" ? "preview" : "edit";
    setMode(newMode);
    if (newMode === "edit") {
      if (isPlaying) handlePlayPause();
      handleReset();
    }
  };

  const handleExport = async () => {
    if (!canExport) {
      toast.error("Animation must be between 2-10 slides and max 15 seconds");
      return;
    }

    const exportContainer = previewRef.current;
    if (!exportContainer) {
      toast.error("Export container not found");
      return;
    }

    setIsExporting(true);
    toast.info("Starting export... This may take a moment.");

    try {
      const videoBlob = await exportAnimation(
        exportContainer,
        slides,
        animationSettings,
        (progress) => {
          // Could show a progress toast or modal here
          console.log(progress);
        }
      );

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `jolly-code-animation-${timestamp}.webm`;
      downloadBlob(videoBlob, filename);

      toast.success("Animation exported successfully!");
      analytics.track("export_animation", {
        slides_count: slides.length,
        duration: totalDuration,
        resolution: animationSettings.resolution,
        fps: animationSettings.fps,
        transition: animationSettings.transitionType,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export animation. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href={themes[backgroundTheme].theme}
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href={fonts[fontFamily].src}
        crossOrigin="anonymous"
      />
      <Room user={null}>
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
          <Sidebar />

          <div className="flex-1 min-h-screen flex flex-col">
            <Nav />

            <main className="flex-1 pt-16 flex flex-col">
              {/* Top Bar with Mode Toggle */}
              <div className="border-b bg-card/50 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-semibold">Code Animation</h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleExport}
                    disabled={!canExport || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="ri-video-download-line mr-2" />
                        Export Video
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Main Content - Centered like code editor */}
              <div className="flex-1 flex items-center justify-center overflow-auto py-6 relative">
                <div className="w-full max-w-6xl px-6">
                  <UnifiedAnimationCanvas
                    ref={previewRef}
                    mode={mode}
                    currentFrame={currentFrame}
                  />
                </div>
              </div>

              {/* Bottom Controls */}
              <div>
                {/* Controls */}
                <AnimationControls
                  mode={mode}
                  isPlaying={isPlaying}
                  progress={progress}
                  totalDuration={totalDuration}
                  onToggleMode={toggleMode}
                  onPlayPause={handlePlayPause}
                  onReset={handleReset}
                  onResetSlides={() => {
                    if (confirm("Reset all slides to default? This will clear your current work.")) {
                      localStorage.removeItem("animation-store");
                      window.location.reload();
                    }
                  }}
                  canPlay={slides.length >= 2}
                />
                {/* Timeline */}
                <Timeline />
              </div>

              {/* <UserTools /> */}
            </main>
          </div>
        </div>
      </Room>
    </>
  );
}
