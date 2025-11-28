"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { AnimationSlide, AnimationSettings } from "@/types/animation";

export type AnimationStoreState = {
  slides: AnimationSlide[];
  activeSlideIndex: number;
  animationSettings: AnimationSettings;
  isPlaying: boolean;
  currentPlaybackTime: number;
  addSlide: () => void;
  removeSlide: (id: string) => void;
  updateSlide: (id: string, updates: Partial<AnimationSlide>) => void;
  reorderSlides: (startIndex: number, endIndex: number) => void;
  setActiveSlide: (index: number) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  updateSettings: (settings: Partial<AnimationSettings>) => void;
  setPlaybackTime: (time: number) => void;
};

const createInitialSlide = (index: number): AnimationSlide => {
  const sampleCode = [
    `// Slide ${index} - JavaScript Example
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet("World");`,
    `// Slide ${index} - TypeScript Example
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Alice",
  age: 30
};`,
  ];

  return {
    id: uuidv4(),
    code: sampleCode[index - 1] || sampleCode[0],
    title: `Slide ${index}`,
    language: "javascript",
    duration: 2,
  };
};

export const useAnimationStore = create<
  AnimationStoreState,
  [["zustand/persist", AnimationStoreState]]
>(
  persist(
    (set, get) => ({
      slides: [createInitialSlide(1), createInitialSlide(2)],
      activeSlideIndex: 0,
      animationSettings: {
        fps: 30,
        resolution: "1080p",
        transitionType: "diff",
      },
      isPlaying: false,
      currentPlaybackTime: 0,

      addSlide: () => {
        const slides = get().slides;
        const newSlide = createInitialSlide(slides.length + 1);
        set({ slides: [...slides, newSlide] });
      },

      removeSlide: (id: string) => {
        const slides = get().slides;
        // Don't allow removing if only 2 slides left (minimum for animation)
        if (slides.length <= 2) return;

        const newSlides = slides.filter((slide) => slide.id !== id);
        const activeIndex = get().activeSlideIndex;

        set({
          slides: newSlides,
          activeSlideIndex: Math.min(activeIndex, newSlides.length - 1),
        });
      },

      updateSlide: (id: string, updates: Partial<AnimationSlide>) => {
        const slides = get().slides;
        const updatedSlides = slides.map((slide) =>
          slide.id === id ? { ...slide, ...updates } : slide
        );
        set({ slides: updatedSlides });
      },

      reorderSlides: (startIndex: number, endIndex: number) => {
        const slides = [...get().slides];
        const [removed] = slides.splice(startIndex, 1);
        slides.splice(endIndex, 0, removed);
        set({ slides });
      },

      setActiveSlide: (index: number) => {
        const slides = get().slides;
        if (index >= 0 && index < slides.length) {
          set({ activeSlideIndex: index });
        }
      },

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      reset: () => set({ isPlaying: false, currentPlaybackTime: 0 }),

      updateSettings: (settings: Partial<AnimationSettings>) => {
        set((state) => ({
          animationSettings: { ...state.animationSettings, ...settings },
        }));
      },

      setPlaybackTime: (time: number) => set({ currentPlaybackTime: time }),
    }),
    { name: "animation-store" }
  )
);
