export type TransitionType = "fade" | "diff";

export type AnimationSlide = {
  id: string;
  code: string;
  title: string;
  language: string;
  duration: number; // in seconds
};

export type AnimationSettings = {
  fps: 24 | 30 | 60;
  resolution: "720p" | "1080p";
  transitionType: TransitionType;
};

export type AnimationProject = {
  id: string;
  slides: AnimationSlide[];
  settings: AnimationSettings;
  created_at?: string;
  updated_at?: string;
};
