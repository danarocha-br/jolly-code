import { AnimationSlide, AnimationSettings } from "@/types/animation";
import { generateDiffTransition, DiffTransitionFrame } from "./transitions/diff-transition";

export type AnimationFrame = {
  type: "slide" | "transition";
  slideIndex: number;
  frame: DiffTransitionFrame | null;
  currentSlide: AnimationSlide;
};

/**
 * Orchestrates the animation playback by yielding frames for each slide and transition.
 */
export async function* playAnimation(
  slides: AnimationSlide[],
  settings: AnimationSettings,
  onProgress?: (current: number, total: number) => void
): AsyncGenerator<AnimationFrame> {
  if (slides.length < 2) {
    throw new Error("At least 2 slides are required for animation");
  }

  const { fps, transitionType } = settings;
  let totalFrames = 0;
  let currentFrame = 0;

  // Calculate total frames
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideFrames = Math.ceil(slide.duration * fps);
    totalFrames += slideFrames;

    // Add transition frames (except for the last slide)
    if (i < slides.length - 1) {
      const transitionDuration = 1.0; // 1000ms transition
      const transitionFrames = Math.ceil(transitionDuration * fps);
      totalFrames += transitionFrames;
    }
  }

  // Generate frames for each slide and transition
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideFrames = Math.ceil(slide.duration * fps);
    const frameDelay = 1000 / fps;

    // Show slide frames
    for (let frame = 0; frame < slideFrames; frame++) {
      yield {
        type: "slide",
        slideIndex: i,
        frame: null,
        currentSlide: slide,
      };

      currentFrame++;
      onProgress?.(currentFrame, totalFrames);
      await new Promise((resolve) => setTimeout(resolve, frameDelay));
    }

    // Show transition to next slide (if not the last slide)
    if (i < slides.length - 1) {
      const nextSlide = slides[i + 1];
      const transitionDuration = 1000; // 1000ms (1 second) for smoother transitions

      const generator = generateDiffTransition(slide, nextSlide, transitionDuration, fps);
      let result = generator.next();
      while (!result.done) {
        yield {
          type: "transition",
          slideIndex: i,
          frame: result.value,
          currentSlide: slide,
        };

        currentFrame++;
        onProgress?.(currentFrame, totalFrames);
        await new Promise((resolve) => setTimeout(resolve, frameDelay));
        result = generator.next();
      }
    }
  }
}

/**
 * Calculates the total duration of the animation in seconds.
 */
export function calculateTotalDuration(
  slides: AnimationSlide[],
  includeTransitions: boolean = true
): number {
  const slideDuration = slides.reduce((sum, slide) => sum + slide.duration, 0);
  const transitionDuration = includeTransitions
    ? (slides.length - 1) * 1.0 // 1000ms per transition
    : 0;
  return slideDuration + transitionDuration;
}
