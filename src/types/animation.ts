export type TransitionType = "fade" | "diff";

export type AnimationSlide = {
  id: string;
  code: string;
  title: string;
  language: string;
  autoDetectLanguage?: boolean;
  duration: number; // in seconds
};

export type AnimationExportFormat = "mp4" | "webm" | "gif";

export type AnimationQualityPreset = "fast" | "balanced" | "high";

export type AnimationSettings = {
  fps: 24 | 30 | 60;
  resolution: "720p" | "1080p";
  transitionType: TransitionType;
  exportFormat: AnimationExportFormat;
  quality: AnimationQualityPreset;
};

export type AnimationProject = {
  id: string;
  slides: AnimationSlide[];
  settings: AnimationSettings;
  created_at?: string;
  updated_at?: string;
};
