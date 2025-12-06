import { AnimationSlide } from "@/types/animation";
import { computeDiff, DiffResult } from "@/lib/utils/diff";

export type DiffTransitionFrame = {
  fromSlide: AnimationSlide;
  toSlide: AnimationSlide;
  progress: number; // 0 to 1
  diff: DiffResult;
  addedOpacity: number;
  removedOpacity: number;
};

/**
 * Easing function for smoother transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Generates diff-based transition frames between two slides.
 * Lines that are removed fade out, lines that are added fade in.
 */
export function* generateDiffTransition(
  fromSlide: AnimationSlide,
  toSlide: AnimationSlide,
  durationMs: number,
  fps: number
): Generator<DiffTransitionFrame> {
  const diff = computeDiff(fromSlide.code, toSlide.code);
  const frameCount = Math.ceil((durationMs / 1000) * fps);

  for (let frame = 0; frame <= frameCount; frame++) {
    const linearProgress = frame / frameCount;
    const progress = easeInOutCubic(linearProgress); // Apply easing

    yield {
      fromSlide,
      toSlide,
      progress,
      diff,
      addedOpacity: progress, // Fade in added lines
      removedOpacity: 1 - progress, // Fade out removed lines
    };
  }
}
