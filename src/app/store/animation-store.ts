"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { Animation } from "@/features/animations/dtos";
import {
  AnimationSlide,
  AnimationSettings,
  AnimationExportFormat,
  AnimationQualityPreset,
} from "@/types/animation";

export type AnimationTabState = {
  id: string;
  animationId?: string;
  title: string;
  saved: boolean;
  slides: AnimationSlide[];
  settings: AnimationSettings;
};

export type AnimationStoreState = {
  slides: AnimationSlide[];
  activeSlideIndex: number;
  animationSettings: AnimationSettings;
  isPlaying: boolean;
  currentPlaybackTime: number;
  animationId?: string;
  isAnimationSaved: boolean;
  tabs: AnimationTabState[];
  activeAnimationTabId?: string;
  createNewAnimation: () => void;
  addSlide: (options?: { maxSlides?: number | null; onLimit?: () => void }) => void;
  removeSlide: (id: string) => void;
  updateSlide: (id: string, updates: Partial<AnimationSlide>) => void;
  reorderSlides: (startIndex: number, endIndex: number) => void;
  setActiveSlide: (index: number) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  updateSettings: (settings: Partial<AnimationSettings>) => void;
  setAllSlideDurations: (duration: number) => void;
  setPlaybackTime: (time: number) => void;
  setAnimationId: (id?: string) => void;
  setIsAnimationSaved: (saved: boolean) => void;
  loadAnimation: (animation: Animation) => void;
  setTabs: (tabs: AnimationTabState[]) => void;
  setActiveAnimationTabId: (id?: string) => void;
  openAnimationInTab: (animation: Animation) => void;
  updateActiveAnimation: (animation: Animation) => void;
  closeTab: (tabId: string) => void;
  removeAnimationFromTabs: (animationId: string) => void;
  resetActiveAnimation: () => void;
};

const createSlide = (index: number, code = "", title?: string): AnimationSlide => ({
  id: uuidv4(),
  code,
  title: title ?? `Slide ${index}`,
  language: "javascript",
  autoDetectLanguage: true,
  duration: 2,
});

const createInitialSlide = (index: number): AnimationSlide => {
  const sampleCode = [
    `// Slide ${index} - JavaScript Example
function greet(name) {

}

greet("World");`,
    `// Slide ${index} - Improved Greeting
function greet(name, { excited = false } = {}) {
  const punctuation = excited ? "!" : ".";

}

greet("World", { excited: true });`,
  ];

  return createSlide(index, sampleCode[index - 1] || sampleCode[0]);
};

const createEmptySlide = (index: number): AnimationSlide => createSlide(index);

const getDefaultExportFormat = (): AnimationExportFormat => {
  if (typeof window === "undefined") {
    return "webm";
  }

  // Prefer MP4 when WebCodecs is available
  const hasWebCodecs =
    typeof VideoEncoder !== "undefined" &&
    typeof VideoEncoder.isConfigSupported === "function";

  return hasWebCodecs ? "mp4" : "webm";
};

const initialSlides = [createInitialSlide(1), createInitialSlide(2)];
const initialSettings: AnimationSettings = {
  fps: 30,
  resolution: "1080p",
  transitionType: "diff",
  exportFormat: getDefaultExportFormat(),
  quality: "balanced",
};
const initialTab: AnimationTabState = {
  id: uuidv4(),
  animationId: undefined,
  title: "Slide 1",
  saved: false,
  slides: initialSlides,
  settings: initialSettings,
};

const sanitizeTabs = (tabs: AnimationTabState[]) =>
  tabs.map((tab) => ({
    ...tab,
    saved: Boolean(tab.animationId) && Boolean(tab.saved),
  }));

export const useAnimationStore = create<AnimationStoreState>()(
  persist<AnimationStoreState>(
    (set, get) => ({
      slides: initialSlides,
      activeSlideIndex: 0,
      animationSettings: initialSettings,
      isPlaying: false,
      currentPlaybackTime: 0,
      animationId: undefined,
      isAnimationSaved: false,
      tabs: sanitizeTabs([initialTab]),
      activeAnimationTabId: initialTab.id,

      createNewAnimation: () => {
        const { tabs, activeAnimationTabId } = get();

        // Sync current state to the active tab before creating a new one
        const updatedTabs = sanitizeTabs(
          tabs.map((tab) => {
            if (tab.id === activeAnimationTabId) {
              return {
                ...tab,
                slides: get().slides,
                settings: get().animationSettings,
                animationId: get().animationId,
                saved: Boolean(get().animationId),
              };
            }
            return tab;
          })
        );

        const newTabId = uuidv4();
        const nextIndex = updatedTabs.length + 1;
        const newTitle = `Slide ${nextIndex}`;

        const slide1 = createInitialSlide(1);
        slide1.title = newTitle;

        const newTab: AnimationTabState = {
          id: newTabId,
          animationId: undefined,
          title: newTitle,
          saved: false,
          slides: [slide1, createInitialSlide(2)],
          settings: {
            fps: 30,
            resolution: "1080p",
            transitionType: "diff",
            exportFormat: getDefaultExportFormat(),
            quality: "balanced",
          },
        };

        set({
          tabs: sanitizeTabs([...updatedTabs, newTab]),
          activeAnimationTabId: newTabId,
          // Set active state to the new tab's state
          slides: newTab.slides,
          activeSlideIndex: 0,
          animationSettings: newTab.settings,
          isPlaying: false,
          currentPlaybackTime: 0,
          animationId: newTab.animationId,
          isAnimationSaved: false,
        });
      },

      addSlide: (options) => {
        const slides = get().slides;
        if (typeof options?.maxSlides === "number" && slides.length >= options.maxSlides) {
          options?.onLimit?.();
          return;
        }
        const newSlide = createEmptySlide(slides.length + 1);
        set({
          slides: [...slides, newSlide],
          activeSlideIndex: slides.length,
        });
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
        const { slides, activeAnimationTabId, tabs } = get();
        const updatedSlides = slides.map((slide) =>
          slide.id === id ? { ...slide, ...updates } : slide
        );

        // If the first slide's title changed, update the tab title
        let updatedTabs = tabs;
        if (slides[0]?.id === id && updates.title) {
          updatedTabs = tabs.map(tab =>
            tab.id === activeAnimationTabId
              ? { ...tab, title: updates.title! }
              : tab
          );
        }

        set({ slides: updatedSlides, tabs: updatedTabs });
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

      setAllSlideDurations: (duration: number) => {
        const { slides, activeAnimationTabId, tabs } = get();
        const clampedDuration = Math.max(0.1, Math.min(15, duration));
        const hasChange = slides.some((slide) => slide.duration !== clampedDuration);

        if (!hasChange) return;

        const updatedSlides = slides.map((slide) => ({
          ...slide,
          duration: clampedDuration,
        }));

        const updatedTabs = tabs.map((tab) =>
          tab.id === activeAnimationTabId ? { ...tab, slides: updatedSlides } : tab
        );

        set({ slides: updatedSlides, tabs: updatedTabs });
      },

      setPlaybackTime: (time: number) => set({ currentPlaybackTime: time }),

      setAnimationId: (id?: string) => {
        const { activeAnimationTabId, tabs } = get();
        const updatedTabs = sanitizeTabs(
          tabs.map(tab =>
            tab.id === activeAnimationTabId
              ? { ...tab, animationId: id }
              : tab
          )
        );
        set({ animationId: id, tabs: updatedTabs, isAnimationSaved: Boolean(id) && get().isAnimationSaved });
      },

      setIsAnimationSaved: (saved: boolean) => {
        const { activeAnimationTabId, tabs } = get();

        const updatedTabs = sanitizeTabs(
          tabs.map(tab =>
            tab.id === activeAnimationTabId
              ? { ...tab, saved: saved && Boolean(tab.animationId) }
              : tab
          )
        );
        set({ isAnimationSaved: saved && Boolean(get().animationId), tabs: updatedTabs });
      },

      loadAnimation: (animation: Animation) => {
        // This is kept for backward compatibility or direct loading, 
        // but openAnimationInTab is preferred for UI interactions
        set(() => ({
          slides: animation.slides || [],
          activeSlideIndex: 0,
          animationSettings: animation.settings || {
            fps: 30,
            resolution: "1080p",
            transitionType: "diff",
            exportFormat: getDefaultExportFormat(),
            quality: "balanced",
          },
          isPlaying: false,
          currentPlaybackTime: 0,
          animationId: animation.id,
          isAnimationSaved: Boolean(animation.id),
        }));
      },

      setTabs: (tabs: AnimationTabState[]) => set({ tabs: sanitizeTabs(tabs) }),

      setActiveAnimationTabId: (id?: string) => {
        const { tabs, activeAnimationTabId } = get();

        if (id === activeAnimationTabId) return;

        // Sync current state to the OLD active tab
        const updatedTabs = sanitizeTabs(
          tabs.map((tab) => {
            if (tab.id === activeAnimationTabId) {
              return {
                ...tab,
                slides: get().slides,
                settings: get().animationSettings,
                animationId: get().animationId,
                saved: Boolean(get().animationId) && get().isAnimationSaved,
              };
            }
            return tab;
          })
        );

        const targetTab = updatedTabs.find((t) => t.id === id);

        if (targetTab) {
          set({
            tabs: updatedTabs,
            activeAnimationTabId: id,
            // Load the NEW tab's state
            slides: targetTab.slides,
            activeSlideIndex: 0,
            animationSettings: targetTab.settings,
            isPlaying: false,
            currentPlaybackTime: 0,
            animationId: targetTab.animationId,
            isAnimationSaved: Boolean(targetTab.animationId),
          });
        } else {
          // Fallback if tab not found (shouldn't happen usually)
          set({ activeAnimationTabId: id, animationId: undefined, isAnimationSaved: false });
        }
      },

      openAnimationInTab: (animation: Animation) => {
        const { tabs, activeAnimationTabId } = get();

        // Check if animation is already open in a tab
        const existingTab = tabs.find(t => t.animationId === animation.id);

        if (existingTab) {
          // If already open, just switch to it
          get().setActiveAnimationTabId(existingTab.id);
          return;
        }

        // Sync current state to the active tab before creating a new one
        const updatedTabs = sanitizeTabs(
          tabs.map((tab) => {
            if (tab.id === activeAnimationTabId) {
              return {
                ...tab,
                slides: get().slides,
                settings: get().animationSettings,
                animationId: get().animationId,
                saved: Boolean(get().animationId) && get().isAnimationSaved,
              };
            }
            return tab;
          })
        );

        const newTabId = uuidv4();
        const newTab: AnimationTabState = {
          id: newTabId,
          animationId: animation.id,
          title: animation.title || "Untitled",
          saved: true,
          slides: animation.slides || [],
          settings: animation.settings || initialSettings,
        };

        set({
          tabs: sanitizeTabs([...updatedTabs, newTab]),
          activeAnimationTabId: newTabId,
          // Set active state to the new tab's state
          slides: newTab.slides,
          activeSlideIndex: 0,
          animationSettings: newTab.settings,
          isPlaying: false,
          currentPlaybackTime: 0,
          animationId: animation.id,
          isAnimationSaved: true,
        });
      },

      updateActiveAnimation: (animation: Animation) => {
        const { activeAnimationTabId, tabs } = get();

        let newSlides = animation.slides || [];
        // Ensure the first slide's title matches the animation title
        // This is important because the app uses slides[0].title as the animation title
        if (newSlides.length > 0 && animation.title && newSlides[0].title !== animation.title) {
          newSlides = [
            { ...newSlides[0], title: animation.title },
            ...newSlides.slice(1)
          ];
        }

        const newSettings = animation.settings || initialSettings;

        // Update store state
        set({
          slides: newSlides,
          activeSlideIndex: 0,
          animationSettings: newSettings,
          isPlaying: false,
          currentPlaybackTime: 0,
          animationId: animation.id,
          isAnimationSaved: Boolean(animation.id),
        });

        // Update active tab
        const updatedTabs = sanitizeTabs(
          tabs.map(tab =>
            tab.id === activeAnimationTabId
              ? {
                ...tab,
                animationId: animation.id,
                title: animation.title,
                saved: Boolean(animation.id),
                slides: newSlides,
                settings: newSettings
              }
              : tab
          )
        );
        set({ tabs: updatedTabs });
      },

      closeTab: (tabId: string) => {
        const { tabs, activeAnimationTabId } = get();

        if (tabs.length <= 1) return; // Don't close the last tab

        const newTabs = sanitizeTabs(tabs.filter(t => t.id !== tabId));

        // If we closed the active tab, switch to another one
        if (tabId === activeAnimationTabId) {
          const closedTabIndex = tabs.findIndex(t => t.id === tabId);
          // Try to go to the left, otherwise right
          const newActiveTab = newTabs[Math.max(0, closedTabIndex - 1)] || newTabs[0];

          set({
            tabs: newTabs,
            activeAnimationTabId: newActiveTab.id,
            // Load the new active tab's state
            slides: newActiveTab.slides,
            activeSlideIndex: 0,
            animationSettings: newActiveTab.settings,
            isPlaying: false,
            currentPlaybackTime: 0,
            animationId: newActiveTab.animationId,
            isAnimationSaved: Boolean(newActiveTab.animationId),
          });
        } else {
          // Just remove the tab, no need to change active state
          set({ tabs: newTabs });
        }
      },

      removeAnimationFromTabs: (id: string) => {
        const { tabs, activeAnimationTabId, animationId } = get();

        // Update tabs list - mark matching tabs as unsaved and remove animation binding
        const updatedTabs = sanitizeTabs(
          tabs.map((tab) => {
            if (tab.animationId === id) {
              return {
                ...tab,
                animationId: undefined,
                saved: false,
              };
            }
            return tab;
          })
        );

        set({ tabs: updatedTabs });

        // If the active animation is the one being deleted, clear the binding in current state
        if (animationId === id) {
          set({
            animationId: undefined,
            isAnimationSaved: false,
          });
        }
      },

      resetActiveAnimation: () => {
        const { activeAnimationTabId, tabs } = get();

        // Create default clean state for reset
        const resetSlides = [createInitialSlide(1), createInitialSlide(2)];
        const resetSettings: AnimationSettings = {
          fps: 30,
          resolution: "1080p",
          transitionType: "diff",
          exportFormat: getDefaultExportFormat(),
          quality: "balanced",
        };

        // Update active store state
        set({
          slides: resetSlides,
          activeSlideIndex: 0,
          animationSettings: resetSettings,
          isPlaying: false,
          currentPlaybackTime: 0,
          animationId: undefined,
          isAnimationSaved: false,
        });

        // Update the active tab in the tabs list
        const updatedTabs = sanitizeTabs(
          tabs.map((tab) => {
            if (tab.id === activeAnimationTabId) {
              return {
                ...tab,
                slides: resetSlides,
                settings: resetSettings,
                animationId: undefined, // Detach from saved animation
                title: "Slide 1", // Reset title
                saved: false,
              };
            }
            return tab;
          })
        );

        set({ tabs: updatedTabs });
      }
    }),
    {
      name: "animation-store",
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        return {
          ...persisted,
          tabs: sanitizeTabs(persisted.tabs || []),
          isAnimationSaved: persisted.animationId ? persisted.isAnimationSaved : false,
        };
      },
    }
  ) as any
);
