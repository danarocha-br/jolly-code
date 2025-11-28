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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAnimationStore } from "@/app/store";
import { AnimationSlide } from "@/types/animation";

type SortableSlideProps = {
  slide: AnimationSlide;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  canRemove: boolean;
};

function SortableSlide({
  slide,
  index,
  isActive,
  onSelect,
  onRemove,
  canRemove,
}: SortableSlideProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex-shrink-0 w-48 h-32 rounded-lg border-2 transition-all",
        isActive
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50",
        isDragging && "opacity-50 scale-95"
      )}
    >
      {/* Drag handle area */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/50"
      >
        <i className="ri-draggable text-muted-foreground" />
      </div>

      {/* Clickable content area */}
      <div onClick={onSelect} className="h-full cursor-pointer">
        <div className="p-3 flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Slide {index + 1}
            </span>
            {canRemove && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <i className="ri-close-line text-sm" />
              </Button>
            )}
          </div>

          <div className="flex-1 bg-muted/30 rounded p-2 overflow-hidden">
            <pre className="text-[8px] leading-tight overflow-hidden whitespace-pre-wrap break-words">
              {slide.code || "Empty slide"}
            </pre>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{slide.title}</span>
            <span>{slide.duration}s</span>
          </div>
        </div>

        {isActive && (
          <div className="absolute inset-0 ring-2 ring-primary ring-offset-2 rounded-lg pointer-events-none" />
        )}
      </div>
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
        <Button
          size="sm"
          onClick={addSlide}
          disabled={!canAddMore}
          variant="secondary"
        >
          <i className="ri-add-line mr-1" />
          Add Slide
        </Button>
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
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
