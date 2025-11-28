"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnimationStore } from "@/app/store";

export const SettingsPanel = () => {
  const animationSettings = useAnimationStore((state) => state.animationSettings);
  const updateSettings = useAnimationStore((state) => state.updateSettings);

  return (
    <div className="px-6 py-4 border-t">
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-muted-foreground">Settings:</span>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="fps-select" className="text-xs text-muted-foreground">FPS</Label>
          <Select
            value={animationSettings.fps.toString()}
            onValueChange={(value) =>
              updateSettings({ fps: parseInt(value) as 24 | 30 | 60 })
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
          <Label htmlFor="resolution-select" className="text-xs text-muted-foreground">Resolution</Label>
          <Select
            value={animationSettings.resolution}
            onValueChange={(value) =>
              updateSettings({ resolution: value as "720p" | "1080p" })
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
              updateSettings({ transitionType: value as "fade" | "diff" })
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
    </div>
  );
};
