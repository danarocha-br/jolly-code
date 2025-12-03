import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserStore } from "@/app/store";
import { fetchAnimationCollections, updateAnimationCollection } from "../queries";
import { Animation, AnimationCollection } from "../dtos";
import { AnimationCollectionsEmptyState } from "../ui/animation-empty-state";
import { AnimationCollectionCard } from "../ui/collection-card";

export type DialogChooseCollectionHandlesProps = {
  openDialog: () => void;
  closeDialog: () => void;
};

type DialogChooseCollectionProps = {
  animation: Animation;
  previousCollectionId: string;
};

export const DialogChooseCollection = forwardRef(
  ({ animation, previousCollectionId }: DialogChooseCollectionProps, ref) => {
    const [isVisible, setVisible] = useState(false);
    const [movingToCollectionId, setMovingToCollectionId] = useState<string | null>(null);
    const user = useUserStore((state) => state.user);
    const queryKey = ["animation-collections"];

    const { data: collections, isLoading, error } = useQuery({
      queryKey,
      queryFn: () => fetchAnimationCollections(),
    });

    const queryClient = useQueryClient();

    const { mutate: handleUpdateCollection } = useMutation({
      mutationFn: updateAnimationCollection,
      onMutate: async (variables) => {
        setMovingToCollectionId(variables.id);
        await queryClient.cancelQueries({ queryKey });
        const previousCollections = queryClient.getQueryData<AnimationCollection[]>(queryKey);

        if (previousCollections) {
          const optimisticCollections = previousCollections.map((collection) => {
            if (collection.id === previousCollectionId) {
              return {
                ...collection,
                animations: collection.animations?.filter((a) => a.id !== animation.id) || [],
              };
            }
            if (collection.id === variables.id) {
              const currentAnimations = collection.animations || [];
              return {
                ...collection,
                animations: [...currentAnimations, animation.id],
              };
            }
            return collection;
          });

          queryClient.setQueryData(queryKey, optimisticCollections);
        }

        return { previousCollections };
      },
      onError: (err, variables, context) => {
        if (context?.previousCollections) {
          queryClient.setQueryData(queryKey, context.previousCollections);
        }

        setMovingToCollectionId(null);
        toast.error("Failed to move animation. Please try again.");
      },
      onSuccess: (data, variables) => {
        const targetCollection = collections?.find((c) => c.id === variables.id);
        toast.success(`Animation moved to "${targetCollection?.title || "collection"}" successfully!`);

        setTimeout(() => {
          closeDialog();
          setMovingToCollectionId(null);
        }, 300);
      },
      onSettled: () => {
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
            <DialogTitle>
              {movingToCollectionId ? (
                <div className="flex items-center gap-2">
                  <i className="ri-loader-4-fill animate-spin text-primary" />
                  <span>Moving animation...</span>
                </div>
              ) : (
                "Choose a collection"
              )}
            </DialogTitle>
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
                <p className="text-sm text-muted-foreground">Failed to load collections</p>
              </div>
            )}

            {!isLoading && !error && collections && collections.length === 0 && (
              <div className="flex justify-center px-24">
                <AnimationCollectionsEmptyState />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 my-4 w-full">
              {!isLoading &&
                !error &&
                collections &&
                collections.length >= 1 &&
                collections
                  ?.sort((a: AnimationCollection, b: AnimationCollection) => a.title.localeCompare(b.title))
                  .map((collection: AnimationCollection) => (
                    <AnimationCollectionCard
                      key={collection.id}
                      id={collection.id}
                      title={collection.title}
                      animations={collection.animations?.map((a) => a.id)}
                      isLoading={movingToCollectionId === collection.id}
                      disabled={movingToCollectionId !== null}
                      onSelect={() =>
                        handleUpdateCollection({
                          id: collection.id || "",
                          previous_collection_id: previousCollectionId,
                          user_id: user?.id || "",
                          animation_id: animation.id,
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
