import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useUserStore } from "@/app/store";
import { fetchCollections, updateCollection } from "../queries";
import { Collection, Snippet } from "../dtos";
import { CollectionsEmptyState } from "../ui/snippet-empty-state";
import { CollectionCard } from '../ui/collection-card';

export type DialogChooseCollectionHandlesProps = {
  openDialog: () => void;
  closeDialog: () => void;
};

type DialogChooseCollectionProps = {
  snippet: Snippet;
  previousCollectionId: string;
};

export const DialogChooseCollection = forwardRef(
  ({ snippet, previousCollectionId }: DialogChooseCollectionProps, ref) => {
    const [isVisible, setVisible] = useState(false);
    const [movingToCollectionId, setMovingToCollectionId] = useState<string | null>(null);
    const user = useUserStore((state) => state.user);
    const queryKey = ["collections"];

    const { data: collections, isLoading, error } = useQuery({
      queryKey,
      queryFn: () => fetchCollections(),
    });

    const queryClient = useQueryClient();

    const { mutate: handleUpdateCollection } = useMutation({
      mutationFn: updateCollection,
      onMutate: async (variables) => {
        // Set loading state for the specific collection
        setMovingToCollectionId(variables.id);

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousCollections = queryClient.getQueryData<Collection[]>(queryKey);

        // Optimistically update the collections
        if (previousCollections) {
          const optimisticCollections = previousCollections.map((collection) => {
            // Remove snippet from previous collection
            if (collection.id === previousCollectionId) {
              return {
                ...collection,
                snippets: collection.snippets?.filter((id) => id !== snippet.id) || [],
              };
            }
            // Add snippet to new collection
            if (collection.id === variables.id) {
              const currentSnippets = collection.snippets || [];
              return {
                ...collection,
                snippets: [...currentSnippets, snippet.id],
              };
            }
            return collection;
          });

          queryClient.setQueryData(queryKey, optimisticCollections);
        }

        return { previousCollections };
      },
      onError: (err, variables, context) => {
        // Revert to previous state on error
        if (context?.previousCollections) {
          queryClient.setQueryData(queryKey, context.previousCollections);
        }
        
        setMovingToCollectionId(null);
        toast.error("Failed to move snippet. Please try again.");
      },
      onSuccess: (data, variables) => {
        // Show success message
        const targetCollection = collections?.find((c) => c.id === variables.id);
        toast.success(`Snippet moved to "${targetCollection?.title || 'collection'}" successfully!`);
        
        // Close the dialog after a brief delay to show the success state
        setTimeout(() => {
          closeDialog();
          setMovingToCollectionId(null);
        }, 300);
      },
      onSettled: () => {
        // Refetch to ensure we're in sync with the server
        queryClient.invalidateQueries({ queryKey });
      },
    });

    const openDialog = useCallback(() => {
      setVisible(true);
      setMovingToCollectionId(null);
    }, []);

    const closeDialog = useCallback(() => {
      setVisible(false);
      setMovingToCollectionId(null);
    }, []);

    useImperativeHandle(ref, () => ({
      openDialog,
      closeDialog,
    }));

    return (
      <Dialog open={isVisible}>
        <DialogContent
          className="w-full md:max-w-[720px]"
          onInteractOutside={movingToCollectionId ? undefined : closeDialog}
          onEscapeKeyDown={movingToCollectionId ? undefined : closeDialog}
        >
          <DialogHeader>
            {movingToCollectionId ? (
              <div className="flex items-center gap-2">
                <i className="ri-loader-4-fill animate-spin text-primary" />
                <span>Moving snippet...</span>
              </div>
            ) : (
              "Choose a collection"
            )}
          </DialogHeader>

          <div className="w-full">
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <i className="ri-loader-4-fill text-4xl animate-spin" />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <i className="ri-error-warning-line text-3xl text-destructive mb-2" />
                <p className="text-sm text-muted-foreground">
                  Failed to load collections
                </p>
              </div>
            )}

            {!isLoading && !error && collections && collections.length === 0 && (
              <div className="flex justify-center px-24">
                <CollectionsEmptyState />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 my-4 w-full">
              {!isLoading &&
                !error &&
                collections &&
                collections.length >= 1 &&
                collections
                  ?.sort((a: Collection, b: Collection) =>
                    a.title.localeCompare(b.title)
                  )
                  .map((collection: Collection) => (
                    <CollectionCard
                      key={collection.id}
                      id={collection.id}
                      title={collection.title}
                      snippets={collection.snippets}
                      isLoading={movingToCollectionId === collection.id}
                      disabled={movingToCollectionId !== null}
                      onSelect={() =>
                        handleUpdateCollection({
                          id: collection.id || "",
                          previous_collection_id: previousCollectionId,
                          user_id: user?.id || "",
                          snippet_id: snippet.id,
                        })
                      }
                    />
                  ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

DialogChooseCollection.displayName = "DialogChooseCollection";
