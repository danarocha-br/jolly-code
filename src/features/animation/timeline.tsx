"use client";
import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import { AnimationSlide } from "@/types/animation";
import { ThemeProps } from "@/lib/themes-options";
import { SlideThumbnail } from "@/components/ui/slide-thumbnail";
import { AddSlideCard } from "@/components/ui/add-slide-card";
import { LoginDialog } from "@/features/login";
import { trackAnimationEvent } from "@/features/animation/analytics";

type TimelineProps = {
  maxSlides?: number | null;
  onSlideLimitReached?: (payload: { current: number; max?: number | null }) => void;
};

type SortableSlideProps = {
  slide: AnimationSlide;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  canRemove: boolean;
  backgroundTheme: ThemeProps;
};

function SortableSlide({
  slide,
  index,
  isActive,
  onSelect,
  onRemove,
  canRemove,
  backgroundTheme,
}: SortableSlideProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  return (
    <SlideThumbnail
      setRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      index={index}
      code={slide.code}
      title={slide.title}
      duration={slide.duration}
      isActive={isActive}
      canRemove={canRemove}
      onSelect={onSelect}
      onRemove={onRemove}
      backgroundTheme={backgroundTheme}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
    />
  );
}

export const Timeline = ({ maxSlides, onSlideLimitReached }: TimelineProps) => {
  const slides = useAnimationStore((state) => state.slides);
  const activeSlideIndex = useAnimationStore((state) => state.activeSlideIndex);
  const addSlide = useAnimationStore((state) => state.addSlide);
  const removeSlide = useAnimationStore((state) => state.removeSlide);
  const setActiveSlide = useAnimationStore((state) => state.setActiveSlide);
  const reorderSlides = useAnimationStore((state) => state.reorderSlides);
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const user = useUserStore((state) => state.user);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = React.useState(false);
  React.useEffect(() => {
    if (user && isLoginDialogOpen) {
      setIsLoginDialogOpen(false);
    }
  }, [user, isLoginDialogOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6, // allow click-to-select without starting drag immediately
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((slide) => slide.id === active.id);
      const newIndex = slides.findIndex((slide) => slide.id === over.id);
      reorderSlides(oldIndex, newIndex);
      trackAnimationEvent("animation_slide_reordered", user, {
        from_index: oldIndex,
        to_index: newIndex,
        total_slides: slides.length,
      });
    }
  };

  const canRemove = slides.length > 2;
  const guestMaxSlides = 3;
  const effectiveMaxSlides = user
    ? typeof maxSlides === "number"
      ? maxSlides
      : null
    : guestMaxSlides;
  const hasReachedGuestLimit = !user && slides.length >= guestMaxSlides;
  const hasReachedMaxSlides =
    typeof effectiveMaxSlides === "number" ? slides.length >= effectiveMaxSlides : false;
  const maxSlidesLabel =
    typeof effectiveMaxSlides === "number" ? `${effectiveMaxSlides}` : "∞";

  const handleAddSlide = () => {
    if (hasReachedGuestLimit) {
      trackAnimationEvent("guest_limit_reached", user, {
        limit_type: "slides",
        action_attempted: "add_slide",
      });
      trackAnimationEvent("guest_upgrade_prompted", user, {
        trigger: "slide_limit",
      });
      setIsLoginDialogOpen(true);
      return;
    }

    if (hasReachedMaxSlides) {
      trackAnimationEvent("slide_limit_blocked", user, {
        limit_type: "slides",
        current: slides.length,
        max: effectiveMaxSlides,
      });
      onSlideLimitReached?.({
        current: slides.length,
        max: typeof effectiveMaxSlides === "number" ? effectiveMaxSlides : null,
      });
      return;
    }

    addSlide({
      maxSlides: typeof effectiveMaxSlides === "number" ? effectiveMaxSlides : undefined,
      onLimit: () => {
        onSlideLimitReached?.({
          current: slides.length,
          max: typeof effectiveMaxSlides === "number" ? effectiveMaxSlides : null,
        });
      },
    });
    const nextCount = slides.length + 1;
    const reachedLimit =
      typeof effectiveMaxSlides === "number" ? nextCount >= effectiveMaxSlides : false;
    trackAnimationEvent("animation_slide_added", user, {
      slide_count: nextCount,
      reached_limit: reachedLimit,
    });
  };

  const handleRemoveSlide = (slideId: string, index: number) => {
    if (!canRemove) return;
    const nextCount = slides.length - 1;
    removeSlide(slideId);
    trackAnimationEvent("animation_slide_removed", user, {
      slide_count_after: nextCount,
      slide_index: index,
    });
  };

  return (
    <div className="w-full py-3 bg-card/70 dark:bg-card/30 border-t border-border dark:border-border/40">
      <LoginDialog
        open={isLoginDialogOpen}
        onOpenChange={setIsLoginDialogOpen}
        hideTrigger
      />

      <div className="flex items-center justify-between mb-3 px-3 sm:px-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Slides</h3>
          <span className="text-xs text-muted-foreground">
            {slides.length}/{maxSlidesLabel}
          </span>
        </div>
        {/* {hasReachedMaxSlides && (
          <span className="text-[11px] text-amber-400">
            You’ve hit your plan limit — click “Add Slide” to upgrade.
          </span>
        )} */}
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="px-3 sm:px-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={slides.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-3">
                {slides.map((slide, index) => (
                  <SortableSlide
                    key={slide.id}
                    slide={slide}
                    index={index}
                    isActive={index === activeSlideIndex}
                    onSelect={() => setActiveSlide(index)}
                    onRemove={() => handleRemoveSlide(slide.id, index)}
                    canRemove={canRemove}
                    backgroundTheme={backgroundTheme}
                  />
                ))}
                <AddSlideCard
                  onAdd={handleAddSlide}
                  disabled={hasReachedMaxSlides}
                />
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
