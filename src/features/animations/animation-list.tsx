"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { useAnimationStore, useUserStore } from "@/app/store";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

import {
  DialogChooseCollectionHandlesProps,
  DialogChooseCollection,
} from "./choose-collection-dialog";
import {
  removeAnimationCollection,
  removeAnimation,
  updateAnimationCollection,
  updateAnimationCollectionTitle,
} from "./queries";
import { AnimationCollection, Animation } from "./dtos";
import { AnimationCollectionItem } from "./ui/collection-item";
import { AnimationCollectionTrigger } from "./ui/collection-trigger";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as AnimationStyles from "./ui/styles";
import { USAGE_QUERY_KEY } from "@/features/user/queries";
import { getUsageLimitsCacheProvider } from "@/lib/services/usage-limits-cache";
import { trackAnimationEvent } from "@/features/animation/analytics";

type CollectionDroppableProps = {
  collectionId: string;
  children: (params: {
    isOver: boolean;
    setNodeRef: (element: HTMLElement | null) => void;
  }) => React.ReactNode;
};

function CollectionDroppable({
  collectionId,
  children,
}: CollectionDroppableProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: collectionId,
    data: { collectionId },
  });

  return children({ isOver, setNodeRef });
}

type AnimationsListProps = {
  collections: AnimationCollection[] | [];
  isRefetching: boolean;
};

export function AnimationsList({ collections, isRefetching }: AnimationsListProps) {
  const [selectedAnimation, setSelectedAnimation] = useState<Animation | null>(null);
  const [previousCollectionId, setPreviousCollectionId] = useState<string>("");
  const [collectionTitle, setCollectionTitle] = useState("");
  const [editableCollectionId, setEditableCollectionId] = useState<string | null>(null);
  const [draggedAnimationId, setDraggedAnimationId] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<Animation | null>(null);
  const [dragSourceCollectionId, setDragSourceCollectionId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    animationId: string;
    toCollectionId: string;
  } | null>(null);
  const moveLockRef = useRef<string | null>(null);

  const collectionTitleInputRef = useRef<HTMLInputElement>(null);
  const lastUpdateTime = useRef(0);
  const moveToFolderDialog = useRef<DialogChooseCollectionHandlesProps>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { openAnimationInTab, setIsAnimationSaved, setAnimationId, removeAnimationFromTabs } = useAnimationStore();
  const user = useUserStore((state) => state.user);
  const userId = useUserStore((state) => state.user?.id);

  const queryClient = useQueryClient();
  const queryKey = ["animation-collections"];
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  const handleAnimationClick = (animation: Animation) => {
    const currentTime = Date.now();

    if (currentTime - lastUpdateTime.current > 500) {
      lastUpdateTime.current = currentTime;
      // setAnimationId(animation.id); // Handled by openAnimationInTab
      // setIsAnimationSaved(true); // Handled by openAnimationInTab
      openAnimationInTab(animation);
      if (pathname !== "/animate") {
        router.push("/animate");
      }
    }
  };

  const handleOpenMoveToFolderDialog = useCallback(
    (animation: Animation, previous_collection_id: string) => {
      setPreviousCollectionId(previous_collection_id);
      setSelectedAnimation(animation);

      moveToFolderDialog && moveToFolderDialog.current?.openDialog();
    },
    []
  );

  const { mutate: handleDeleteCollection } = useMutation({
    mutationFn: removeAnimationCollection,
    onSuccess: (data, variables) => {
      trackAnimationEvent("delete_animation_collection", user, {
        collection_id: variables.collection_id,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<AnimationCollection[]>(queryKey);

      if (previousState) {
        queryClient.setQueryData<AnimationCollection[]>(
          queryKey,
          previousState.filter((c) => c.id !== variables.collection_id)
        );
      }

      return { previousState };
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // Clear the usage limits cache BEFORE any query invalidation to prevent race condition
      // This must happen synchronously before invalidateQueries triggers refetch
      if (user?.id) {
        const cacheProvider = getUsageLimitsCacheProvider();
        cacheProvider.delete(user.id);
      }
      if (user?.id) {
        // Invalidate after cache is cleared to ensure fresh data
        queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, user.id] });
      }
    },
  });

  const { mutate: handleUpdateCollection } = useMutation({
    mutationFn: updateAnimationCollectionTitle,
    onSuccess: (data, variables) => {
      trackAnimationEvent("update_animation_collection", user, {
        collection_id: variables.id,
        new_title: variables.title,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<AnimationCollection[]>(queryKey);

      if (previousState) {
        queryClient.setQueryData<AnimationCollection[]>(
          queryKey,
          previousState.map((c) =>
            c.id === variables.id ? { ...c, title: variables.title || "" } : c
          )
        );
      }

      return { previousState };
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const { mutate: handleDeleteAnimation } = useMutation({
    mutationFn: removeAnimation,
    onSuccess: (data, variables) => {
      if (variables.animation_id) {
        removeAnimationFromTabs(variables.animation_id);
      }
      trackAnimationEvent("delete_animation", user, {
        animation_id: variables.animation_id,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<AnimationCollection[]>(queryKey);

      if (previousState) {
        queryClient.setQueryData<AnimationCollection[]>(
          queryKey,
          previousState.map((c) => ({
            ...c,
            animations: c.animations?.filter((a) => a.id !== variables.animation_id) || [],
          }))
        );
      }

      return { previousState };
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["animation"] });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, userId] });
      }
    },
  });

  const { mutate: handleMoveAnimation } = useMutation({
    mutationFn: updateAnimationCollection,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCollections = queryClient.getQueryData<AnimationCollection[]>(queryKey);

      setPendingMove({
        animationId: variables.animation_id,
        toCollectionId: variables.id,
      });

      if (previousCollections) {
        queryClient.setQueryData<AnimationCollection[]>(
          queryKey,
          previousCollections.map((collection) => {
            if (collection.id === variables.previous_collection_id) {
              return {
                ...collection,
                animations:
                  collection.animations?.filter(
                    (a) => a.id !== variables.animation_id
                  ) || [],
              };
            }

            if (collection.id === variables.id) {
              const currentAnimations = collection.animations || [];
              if (currentAnimations.some((a) => a.id === variables.animation_id)) {
                return collection;
              }
              const animationToMove = previousCollections?.flatMap((c) => c.animations || []).find((a) => a.id === variables.animation_id);

              if (!animationToMove) return collection;

              return {
                ...collection,
                animations: [...currentAnimations, animationToMove],
              };
            }

            return collection;
          })
        );
      }

      return { previousCollections };
    },
    onError: (err, variables, context) => {
      if (context?.previousCollections) {
        queryClient.setQueryData(queryKey, context.previousCollections);
      }
      setDraggedAnimationId(null);
      setDragSourceCollectionId(null);
      setPendingMove(null);
      moveLockRef.current = null;
    },
    onSuccess: (data, variables) => {
      trackAnimationEvent("move_animation", user, {
        animation_id: variables.animation_id,
        from_collection_id: variables.previous_collection_id,
        to_collection_id: variables.id,
      });
      trackAnimationEvent("animation_moved_to_collection", user, {
        animation_id: variables.animation_id,
        from_collection_id: variables.previous_collection_id,
        to_collection_id: variables.id,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      setDraggedAnimationId(null);
      setDragSourceCollectionId(null);
      setPendingMove(null);
      moveLockRef.current = null;
    },
  });

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as
        | { animation?: Animation; collectionId?: string }
        | undefined;

      if (data?.animation && data?.collectionId) {
        setDraggedAnimationId(data.animation.id);
        setDragSourceCollectionId(data.collectionId);
        setActiveAnimation(data.animation);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as
        | { animation?: Animation; collectionId?: string }
        | undefined;
      const targetCollectionId = event.over?.id?.toString();

      // Prevent concurrent moves for the same animation while a move is pending
      if (data?.animation && pendingMove?.animationId === data.animation.id) {
        return;
      }

      // Block moves if any animation move is currently locked (guard against rapid re-entrancy before state updates)
      if (moveLockRef.current) {
        return;
      }

      if (
        data?.animation &&
        data?.collectionId &&
        targetCollectionId &&
        targetCollectionId !== data.collectionId
      ) {
        // Optimistically lock this animation move immediately
        moveLockRef.current = data.animation.id;
        setPendingMove({
          animationId: data.animation.id,
          toCollectionId: targetCollectionId,
        });

        handleMoveAnimation({
          id: targetCollectionId,
          previous_collection_id: data.collectionId,
          user_id: user?.id || "",
          animation_id: data.animation.id,
        });
      } else {
        setDraggedAnimationId(null);
        setDragSourceCollectionId(null);
      }
      setActiveAnimation(null);
    },
    [handleMoveAnimation, user?.id]
  );

  const handleDragCancel = useCallback(() => {
    setDraggedAnimationId(null);
    setDragSourceCollectionId(null);
    setActiveAnimation(null);
  }, []);

  const sortedCollections = useMemo(() => {
    if (!collections) return [];
    const list = [...collections];
    const homeIndex = list.findIndex((c) => c.title === "Home");
    if (homeIndex > 0) {
      const [home] = list.splice(homeIndex, 1);
      list.unshift(home);
    }
    return list;
  }, [collections]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {sortedCollections && (
        <div className="flex flex-col items-center justify-center">
          <Accordion
            type="multiple"
            defaultValue={
              sortedCollections && sortedCollections.length > 0 ? [sortedCollections[0].id] : []
            }
            className="w-full"
          >
            {sortedCollections && !isRefetching ? (
              sortedCollections.map((collection: AnimationCollection) => (
                <CollectionDroppable key={collection.id} collectionId={collection.id}>
                  {({ isOver, setNodeRef }) => {
                    const isDropTargetActive =
                      isOver &&
                      dragSourceCollectionId !== collection.id &&
                      !!draggedAnimationId;
                    const isMoveDestination =
                      pendingMove?.toCollectionId === collection.id;

                    return (
                      <div
                        ref={setNodeRef}
                        className={cn(
                          "rounded-md transition-colors",
                          isDropTargetActive &&
                          "border border-dashed border-indigo-200 bg-indigo-200/30 dark:border-primary/50 dark:bg-primary/5"
                        )}
                      >
                        <AccordionItem key={collection.id} value={collection.id}>
                          <AnimationCollectionTrigger
                            title={collection.title}
                            isBusy={isMoveDestination}
                            isDropTarget={isDropTargetActive}
                            onRemove={() => {
                              // #region agent log
                              fetch('http://127.0.0.1:7242/ingest/17c92283-0a96-4e7e-a254-0870622a7b75', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sessionId: 'debug-session',
                                  runId: 'run-animations',
                                  hypothesisId: 'AH2',
                                  location: 'features/animations/animation-list.tsx:418',
                                  message: 'UI delete animation collection trigger',
                                  data: {
                                    collectionId: collection.id,
                                    animationCount: collection.animations?.length ?? 0,
                                  },
                                  timestamp: Date.now(),
                                }),
                              }).catch(() => { })
                              // #endregion

                              if (collection.animations?.length) {
                                const confirmed = window.confirm(
                                  "Deleting this folder will also delete all animations inside. This cannot be undone. Continue?"
                                );
                                if (!confirmed) {
                                  return;
                                }
                              }

                              if (collection.animations?.length) {
                                const animationIds = collection.animations.map((a) => a.id);
                                useAnimationStore.setState((state) => {
                                  animationIds.forEach((id) => {
                                    state.removeAnimationFromTabs(id);
                                  });
                                  return state;
                                });
                              }

                              handleDeleteCollection({
                                collection_id: collection.id,
                                user_id: collection.user_id,
                              });
                            }}
                            onUpdate={() => {
                              collectionTitleInputRef.current?.focus();
                              setCollectionTitle(collection.title);
                              setEditableCollectionId(collection.id);
                            }}
                          >
                            <>
                              <i className="ri-folder-line mr-3 " />
                              {editableCollectionId === collection.id ? (
                                <input
                                  ref={collectionTitleInputRef}
                                  id={collection.id}
                                  type="text"
                                  onBlur={() => {
                                    setEditableCollectionId(null);
                                    handleUpdateCollection({
                                      id: collection.id,
                                      user_id: collection.user_id,
                                      title: collectionTitle,
                                    });
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      collectionTitleInputRef.current?.blur();
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      collectionTitleInputRef.current?.blur();
                                    }
                                  }}
                                  onChange={(e) => setCollectionTitle(e.target.value)}
                                  value={collectionTitle}
                                  className="bg-transparent border-2 border-secondary dark:border-border outline-none dark:focus:border-primary focus:border-indigo-200 rounded-sm p-px px-2 w-[80%]"
                                />
                              ) : (
                                collection.title
                              )}

                              {collection.animations &&
                                collection.animations?.length > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="absolute right-0 rounded-full px-2 w-6 h-6 group-hover:opacity-0 scale-90"
                                  >
                                    {collection.animations?.length}
                                  </Badge>
                                )}
                            </>
                          </AnimationCollectionTrigger>

                          <AccordionContent>
                            <ul className="w-full grid grid-cols-1 gap-2">
                              {collection.animations?.length
                                ? collection.animations.map((animationItem) => (
                                  <AnimationCollectionItem
                                    key={animationItem.id}
                                    animation={animationItem}
                                    collectionId={collection.id}
                                    onItemSelect={handleAnimationClick}
                                    onDelete={handleDeleteAnimation}
                                    onMoveToCollection={handleOpenMoveToFolderDialog}
                                    isPendingMove={
                                      pendingMove?.animationId === animationItem.id
                                    }
                                    isDragging={draggedAnimationId === animationItem.id}
                                  />
                                ))
                                : null}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      </div>
                    );
                  }}
                </CollectionDroppable>
              ))
            ) : (
              <div className="w-full flex flex-col gap-3">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            )}
          </Accordion>
        </div>
      )}

      {selectedAnimation && (
        <DialogChooseCollection
          ref={moveToFolderDialog}
          animation={selectedAnimation}
          previousCollectionId={previousCollectionId}
        />
      )}

      <DragOverlay adjustScale={false}>
        {activeAnimation ? (
          <div className={AnimationStyles.animationItem({ dragging: true, origin: false })}>
            <span className="scale-75">
              <i className="ri-movie-line" />
            </span>
            <p className="flex-2 truncate capitalize">{activeAnimation.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
