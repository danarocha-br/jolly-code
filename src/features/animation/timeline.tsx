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
import { useAnimationStore, useEditorStore } from "@/app/store";
import { AnimationSlide } from "@/types/animation";
import { ThemeProps } from "@/lib/themes-options";
import { SlideThumbnail } from "@/components/ui/slide-thumbnail";
import { AddSlideCard } from "@/components/ui/add-slide-card";

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
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <SlideThumbnail
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
    </div>
  );
}

export const Timeline = () => {
  const slides = useAnimationStore((state) => state.slides);
  const activeSlideIndex = useAnimationStore((state) => state.activeSlideIndex);
  const addSlide = useAnimationStore((state) => state.addSlide);
  const removeSlide = useAnimationStore((state) => state.removeSlide);
  const setActiveSlide = useAnimationStore((state) => state.setActiveSlide);
  const reorderSlides = useAnimationStore((state) => state.reorderSlides);
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    }
  };

  const canRemove = slides.length > 2;
  const canAddMore = slides.length < 10;

  return (
    <div className="w-full py-4 bg-card/30 border-t">
      <div className="flex items-center justify-between mb-3 px-6">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">Slides</h3>
          <span className="text-xs text-muted-foreground">
            {slides.length}/10
          </span>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="px-6">
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
                    onRemove={() => removeSlide(slide.id)}
                    canRemove={canRemove}
                    backgroundTheme={backgroundTheme}
                  />
                ))}
                <AddSlideCard onAdd={addSlide} disabled={!canAddMore} />
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
