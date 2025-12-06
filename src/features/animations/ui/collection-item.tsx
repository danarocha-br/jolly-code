import React, { Suspense } from "react";
import { UseMutateFunction, useQuery } from "@tanstack/react-query";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimationStore, useUserStore } from "@/app/store";
import { fetchAnimationById, RemoveAnimationProps } from "../queries";
import { Animation } from "../dtos";
import * as S from "./styles";
import { calculateTotalDuration } from "@/features/animation";

type AnimationItemProps = {
  animation: Animation;
  collectionId: string;
  onItemSelect: (animation: Animation) => void;
  onMoveToCollection: (animation: Animation, previous_collection_id: string) => void;
  onDelete: UseMutateFunction<void, Error, RemoveAnimationProps, unknown>;
  isDragging?: boolean;
  isPendingMove?: boolean;
};

export const AnimationCollectionItem = React.memo(function AnimationCollectionItem({
  animation,
  collectionId,
  onItemSelect,
  onDelete,
  onMoveToCollection,
  isDragging = false,
  isPendingMove = false,
}: AnimationItemProps) {
  const user = useUserStore((state) => state.user);
  const animationsStore = useAnimationStore();

  useQuery({
    queryKey: ["animation", animation.id],
    queryFn: () => fetchAnimationById(animation.id),
    enabled: false,
  });

  const { attributes, listeners, setNodeRef, transform, isDragging: draggingSelf } =
    useDraggable({
      id: animation.id,
      data: {
        animation,
        collectionId,
      },
    });

  const dragging = isDragging || draggingSelf;
  const isOriginPlaceholder = draggingSelf;
  const style = draggingSelf
    ? { opacity: 0.6 }
    : transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  const slidesCount = animation.slides?.length ?? 0;
  const duration = calculateTotalDuration(animation.slides || []);
  const transitionType = animation.settings?.transitionType || "fade";
  const transitionIcon =
    transitionType === "diff" ? "ri-sparkling-2-line" : "ri-arrow-right-line";

  return (
    <li
      ref={setNodeRef}
      className={S.animationItem({
        dragging,
        origin: isOriginPlaceholder,
        pending: isPendingMove,
      })}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${animation.title} to another collection`}
      data-pending-move={isPendingMove || undefined}
    >
      <Suspense fallback={<Skeleton />}>
        <button
          className="flex items-center justify-between text-left gap-2 w-full p-1"
          onClick={() => {
            if (dragging) return;
            onItemSelect(animation);
          }}
        >
          <div className="flex flex-col items-start gap-px w-full">
            <p className="flex-2 truncate capitalize">{animation.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <span className="inline-flex items-center gap-1">
                <i className="ri-film-line" /> {slidesCount} slides
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="ri-timer-2-line" /> {duration.toFixed(1)}s
              </span>
              <span className="inline-flex items-center gap-1">
                <i className={transitionIcon} /> {transitionType}
              </span>
            </div>
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity !-mr-2 mt-1.5"
            >
              <i className="ri-more-line text-lg" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onMoveToCollection({ ...animation }, collectionId)}
            >
              <i className="ri-folder-line mr-3" /> Move to collection
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                if (animationsStore.animationId === animation.id) {
                  animationsStore.setIsAnimationSaved(false);
                  animationsStore.setAnimationId(undefined);
                }
                onDelete({ animation_id: animation.id, user_id: user?.id });
              }}
            >
              <div>
                <i className="ri-bookmark-2-line mr-3" />
                Remove
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Suspense>
    </li>
  );
});
