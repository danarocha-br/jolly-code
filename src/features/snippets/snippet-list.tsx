"use client";
import { useCallback, useMemo, useRef, useState } from "react";
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

import { EditorState, useEditorStore, useUserStore } from "@/app/store";
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
  removeCollection,
  removeSnippet,
  updateCollection,
  updateCollectionTitle,
} from "./queries";
import { Collection, Snippet } from "./dtos";
import { CollectionItem } from "./ui/collection-item";
import { CollectionTrigger } from "./ui/collection-trigger";
import { Badge } from "@/components/ui/badge";
import { analytics } from "@/lib/services/tracking";
import { cn } from "@/lib/utils";
import { languagesLogos } from "@/lib/language-logos";
import * as SnippetStyles from "./ui/styles";
import { USAGE_QUERY_KEY } from "@/features/user/queries";
import { getUsageLimitsCacheProvider } from "@/lib/services/usage-limits-cache";

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

  return <>{children({ isOver, setNodeRef })}</>;
}

type SnippetsListProps = {
  collections: Collection[] | [];
  isRefetching: boolean;
};

export function SnippetsList({ collections, isRefetching }: SnippetsListProps) {
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [previousCollectionId, setPreviousCollectionId] = useState<string>("");
  const [collectionTitle, setCollectionTitle] = useState("");
  const [editableCollectionId, setEditableCollectionId] = useState<
    string | null
  >(null);
  const [draggedSnippetId, setDraggedSnippetId] = useState<string | null>(null);
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [dragSourceCollectionId, setDragSourceCollectionId] = useState<
    string | null
  >(null);
  const [pendingMove, setPendingMove] = useState<{
    snippetId: string;
    toCollectionId: string;
  } | null>(null);


  const collectionTitleInputRef = useRef<HTMLInputElement>(null);
  const lastUpdateTime = useRef(0);
  const moveToFolderDialog = useRef<DialogChooseCollectionHandlesProps>(null);

  const { setActiveTab, editors, addEditor } = useEditorStore();
  const user = useUserStore((state) => state.user);
  const userId = useUserStore((state) => state.user?.id);

  const queryClient = useQueryClient();
  const queryKey = ["collections"];
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  const handleSnippetClick = (snippet: Snippet) => {
    const currentTime = Date.now();

    if (currentTime - lastUpdateTime.current > 500) {
      lastUpdateTime.current = currentTime;

      const isSnippetAlreadyInEditors = editors.some(
        (editor) => editor.id === snippet.id
      );

      if (!isSnippetAlreadyInEditors) {
        const newEditor: EditorState = {
          ...snippet,
          userHasEditedCode: true,
          autoDetectLanguage: true,
          editorShowLineNumbers: false,
          isSnippetSaved: true,
        };
        addEditor(newEditor);
      }

      setActiveTab(snippet.id);
    }
  };

  const handleOpenMoveToFolderDialog = useCallback(
    (snippet: Snippet, previous_collection_id: string) => {
      setPreviousCollectionId(previous_collection_id);
      setSelectedSnippet(snippet);

      moveToFolderDialog && moveToFolderDialog.current?.openDialog();
    },
    []
  );

  const { mutate: handleDeleteCollection } = useMutation({
    mutationFn: removeCollection,
    onSuccess: (data, variables) => {
      analytics.track("delete_collection", {
        collection_id: variables.collection_id,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<Collection[]>(queryKey);

      if (previousState) {
        queryClient.setQueryData<Collection[]>(
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
    },
  });

  const { mutate: handleUpdateCollection } = useMutation({
    mutationFn: updateCollectionTitle,
    onSuccess: (data, variables) => {
      analytics.track("update_collection", {
        collection_id: variables.id,
        new_title: variables.title,
      });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<Collection[]>(queryKey);

      if (previousState) {
        queryClient.setQueryData<Collection[]>(
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

  const { mutate: handleDeleteSnippet } = useMutation({
    mutationFn: removeSnippet,
    onMutate: async (variables) => {
      // Cancel and clear cache BEFORE mutation to prevent race condition
      if (userId) {
        await queryClient.cancelQueries({ queryKey: [USAGE_QUERY_KEY, userId] });
        const cacheProvider = getUsageLimitsCacheProvider();
        cacheProvider.delete(userId);
      }
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<Collection[]>(queryKey);

      if (previousState) {
        queryClient.setQueryData<Collection[]>(
          queryKey,
          previousState.map((c) => ({
            ...c,
            snippets: c.snippets?.filter((s) => s.id !== variables.snippet_id) || [],
          }))
        );
      }

      return { previousState };
    },
    onSuccess: (data, variables) => {
      analytics.track("delete_snippet", {
        snippet_id: variables.snippet_id,
      });
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
    },

    onSettled: () => {
      // Clear cache again right before invalidation to catch any Promises that were in flight
      if (userId) {
        const cacheProvider = getUsageLimitsCacheProvider();
        cacheProvider.delete(userId);
      }
      queryClient.invalidateQueries({ queryKey });
      // Invalidate any cached snippet queries to avoid fetching deleted snippets
      queryClient.invalidateQueries({ queryKey: ['snippet'] });
      if (userId) {
        // Invalidate usage query (cache cleared above)
        queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, userId] });
      }
    },
  });

  const { mutate: handleMoveSnippet } = useMutation({
    mutationFn: updateCollection,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousCollections = queryClient.getQueryData<Collection[]>(queryKey);

      setPendingMove({
        snippetId: variables.snippet_id,
        toCollectionId: variables.id,
      });

      if (previousCollections) {
        queryClient.setQueryData<Collection[]>(
          queryKey,
          previousCollections.map((collection) => {
            if (collection.id === variables.previous_collection_id) {
              return {
                ...collection,
                snippets:
                  collection.snippets?.filter(
                    (s) => s.id !== variables.snippet_id
                  ) || [],
              };
            }

            if (collection.id === variables.id) {
              const currentSnippets = collection.snippets || [];
              if (currentSnippets.some(s => s.id === variables.snippet_id)) {
                return collection;
              }
              // We need the full snippet object here for optimistic update.
              // Since we don't have it easily available in this context without fetching or passing it,
              // we might need to rely on the server response or try to find it in the previous collection.
              // For now, let's try to find it in the previous collection.
              const snippetToMove = previousCollections?.flatMap(c => c.snippets || []).find(s => s.id === variables.snippet_id);

              if (!snippetToMove) return collection;

              return {
                ...collection,
                snippets: [...currentSnippets, snippetToMove],
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
      setDraggedSnippetId(null);
      setDragSourceCollectionId(null);
      setPendingMove(null);
    },
    onSuccess: (data, variables) => {
      analytics.track("move_snippet", {
        snippet_id: variables.snippet_id,
        from_collection_id: variables.previous_collection_id,
        to_collection_id: variables.id,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      setDraggedSnippetId(null);
      setDragSourceCollectionId(null);
      setPendingMove(null);
    },
  });

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as
        | { snippet?: Snippet; collectionId?: string }
        | undefined;

      if (data?.snippet && data?.collectionId) {
        setDraggedSnippetId(data.snippet.id);
        setDragSourceCollectionId(data.collectionId);
        setActiveSnippet(data.snippet);
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const data = event.active.data.current as
        | { snippet?: Snippet; collectionId?: string }
        | undefined;
      const targetCollectionId = event.over?.id?.toString();

      if (
        data?.snippet &&
        data?.collectionId &&
        targetCollectionId &&
        targetCollectionId !== data.collectionId
      ) {
        handleMoveSnippet({
          id: targetCollectionId,
          previous_collection_id: data.collectionId,
          user_id: user?.id || "",
          snippet_id: data.snippet.id,
        });
      } else {
        setDraggedSnippetId(null);
        setDragSourceCollectionId(null);
      }
      setActiveSnippet(null);
    },
    [handleMoveSnippet, user?.id]
  );

  const handleDragCancel = useCallback(() => {
    setDraggedSnippetId(null);
    setDragSourceCollectionId(null);
    setActiveSnippet(null);
  }, []);

  const sortedCollections = useMemo(() => {
    return collections.sort((a, b) =>
      a.title === "Home" ? -1 : b.title === "Home" ? 1 : 0
    );
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
              sortedCollections.map((collection: Collection) => (
                <CollectionDroppable key={collection.id} collectionId={collection.id}>
                  {({ isOver, setNodeRef }) => {
                    const isDropTargetActive =
                      isOver &&
                      dragSourceCollectionId !== collection.id &&
                      !!draggedSnippetId;
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
                          <CollectionTrigger
                            title={collection.title}
                            isBusy={isMoveDestination}
                            isDropTarget={isDropTargetActive}
                            onRemove={() => {
                              useEditorStore.setState({
                                editors: editors.map((editor) => {
                                  if (
                                    collection.snippets?.some(
                                      (snippet) => snippet.id === editor.id
                                    )
                                  ) {
                                    return {
                                      ...editor,
                                      isSnippetSaved: false,
                                    };
                                  }
                                  return editor;
                                }),
                              });
                              handleDeleteCollection({
                                collection_id: collection.id,
                                user_id: collection.user_id,
                              })
                            }
                            }
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

                              {collection.snippets &&
                                collection.snippets?.length > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="absolute right-0 rounded-full px-2 w-6 h-6 group-hover:opacity-0 scale-90"
                                  >
                                    {collection.snippets?.length}
                                  </Badge>
                                )}
                            </>
                          </CollectionTrigger>

                          <AccordionContent>
                            <ul className="w-full grid grid-cols-1 gap-2">
                              {collection.snippets?.length
                                ? collection.snippets.map((snippet) => (
                                  <CollectionItem
                                    key={snippet.id}
                                    snippet={snippet}
                                    collectionId={collection.id}
                                    onItemSelect={handleSnippetClick}
                                    onDelete={handleDeleteSnippet}
                                    onMoveToCollection={handleOpenMoveToFolderDialog}
                                    isPendingMove={
                                      pendingMove?.snippetId === snippet.id
                                    }
                                    isDragging={draggedSnippetId === snippet.id}
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

      {selectedSnippet && (
        <DialogChooseCollection
          ref={moveToFolderDialog}
          snippet={selectedSnippet}
          previousCollectionId={previousCollectionId}
        />
      )}

      <DragOverlay adjustScale={false}>
        {activeSnippet ? (
          <div className={SnippetStyles.snippet({ dragging: true, origin: false })}>
            <span className="scale-75">
              {languagesLogos[
                activeSnippet.language as keyof typeof languagesLogos
              ]}
            </span>
            <p className="flex-2 truncate capitalize">{activeSnippet.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
