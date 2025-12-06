"use client";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnimationStore, useUserStore } from "@/app/store";
import { supportsWebCodecsEncoding } from "@/features/animation";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { AnimationSettings } from "@/types/animation";

const exportFormatExperiment = process.env.NEXT_PUBLIC_EXPORT_EXPERIMENT ?? "control";
const transitionExperiment = process.env.NEXT_PUBLIC_TRANSITION_EXPERIMENT ?? "control";

export const SettingsPanel = () => {
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const updateSettings = useAnimationStore((state) => state.updateSettings);
  const user = useUserStore((state) => state.user);
  const [webCodecsSupported] = useState(() => supportsWebCodecsEncoding());

  const handleSettingChange = <K extends keyof AnimationSettings>(setting: K, value: AnimationSettings[K]) => {
    const previous = animationSettings[setting];
    if (previous === value) return;

    updateSettings({ [setting]: value } as Partial<AnimationSettings>);
    trackAnimationEvent("animation_settings_changed", user, {
      setting_name: setting,
      old_value: previous,
      new_value: value,
      export_format_experiment: exportFormatExperiment,
      transition_experiment: transitionExperiment,
    });

    if (setting === "exportFormat") {
      trackAnimationEvent("animation_export_format_selected", user, {
        format: value,
        webcodecs_supported: webCodecsSupported,
        export_format_experiment: exportFormatExperiment,
      });
    }
  };

  useEffect(() => {
    if (!webCodecsSupported && animationSettings.exportFormat === "mp4") {
      updateSettings({ exportFormat: "webm" });
      trackAnimationEvent("animation_settings_changed", user, {
        setting_name: "exportFormat",
        old_value: "mp4",
        new_value: "webm",
      });
      trackAnimationEvent("animation_export_format_selected", user, {
        format: "webm",
        webcodecs_supported: webCodecsSupported,
      });
    }
  }, [animationSettings.exportFormat, updateSettings, user, webCodecsSupported]);

  return (
    <div className="px-6 py-4 border-t">
      <div className="flex flex-wrap items-center gap-6">
        <span className="text-sm font-semibold text-muted-foreground">Settings:</span>

        <div className="flex items-center gap-2">
          <Label htmlFor="format-select" className="text-xs text-muted-foreground">Format</Label>
          <Select
            value={animationSettings.exportFormat}
            onValueChange={(value) =>
              handleSettingChange("exportFormat", value as "mp4" | "webm")
            }
          >
            <SelectTrigger id="format-select" className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4" disabled={!webCodecsSupported}>
                MP4 (H.264)
              </SelectItem>
              <SelectItem value="webm">WebM (VP9)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="fps-select" className="text-xs text-muted-foreground">FPS</Label>
          <Select
            value={animationSettings.fps.toString()}
            onValueChange={(value) =>
              handleSettingChange("fps", parseInt(value) as 24 | 30 | 60)
            }
          >
            <SelectTrigger id="fps-select" className="h-8 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="60">60</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="quality-select" className="text-xs text-muted-foreground">Quality</Label>
          <Select
            value={animationSettings.quality}
            onValueChange={(value) =>
              handleSettingChange("quality", value as "fast" | "balanced" | "high")
            }
          >
            <SelectTrigger id="quality-select" className="h-8 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fast">Fast (smaller)</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="high">High quality</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="resolution-select" className="text-xs text-muted-foreground">Resolution</Label>
          <Select
            value={animationSettings.resolution}
            onValueChange={(value) =>
              handleSettingChange("resolution", value as "720p" | "1080p")
            }
          >
            <SelectTrigger id="resolution-select" className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720p">720p</SelectItem>
              <SelectItem value="1080p">1080p</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="transition-select" className="text-xs text-muted-foreground">Transition</Label>
          <Select
            value={animationSettings.transitionType}
            onValueChange={(value) =>
              handleSettingChange("transitionType", value as "fade" | "diff")
            }
          >
            <SelectTrigger id="transition-select" className="h-8 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="diff">Diff</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!webCodecsSupported && (
        <p className="text-xs text-amber-600 mt-3">
          MP4 export needs a WebCodecs-compatible browser (Chrome/Edge 94+, Safari 16.4+). Falling back to WebM.
        </p>
      )}
    </div>
  );
};
