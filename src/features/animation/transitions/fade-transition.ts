import { AnimationSlide } from "@/types/animation";

export type FadeTransitionFrame = {
  fromSlide: AnimationSlide;
  toSlide: AnimationSlide;
  progress: number; // 0 to 1
  fromOpacity: number;
  toOpacity: number;
};

/**
 * Generates fade transition frames between two slides.
 */
export function* generateFadeTransition(
  fromSlide: AnimationSlide,
  toSlide: AnimationSlide,
  durationMs: number,
  fps: number
): Generator<FadeTransitionFrame> {
  const frameCount = Math.ceil((durationMs / 1000) * fps);
  const frameDelay = 1000 / fps;

  for (let frame = 0; frame <= frameCount; frame++) {
    const progress = frame / frameCount;
    
    yield {
      fromSlide,
      toSlide,
      progress,
      fromOpacity: 1 - progress,
      toOpacity: progress,
    };
  }
}
