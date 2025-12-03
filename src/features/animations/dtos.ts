import { AnimationSettings, AnimationSlide } from "@/types/animation";

export interface Animation {
  id: string;
  user_id: string;
  title: string;
  slides: AnimationSlide[];
  settings: AnimationSettings;
  url?: string | null | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface AnimationCollection {
  id: string;
  user_id: string;
  title: string;
  animations?: Animation[];
  created_at?: string;
  updated_at?: string;
}
