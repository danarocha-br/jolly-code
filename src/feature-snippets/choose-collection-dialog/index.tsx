import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { CollectionCard } from "@/components/ui/collection-card";
import { useUserStore } from "@/app/store";
import { fetchCollections, updateCollection } from "../db-helpers";
import { Collection, Snippet } from "../dtos";
import { CollectionsEmptyState } from "../ui/snippet-empty-state";

export type DialogChooseCollectionHandlesProps = {
  openDialog: () => void;
  closeDialog: () => void;
};

type DialogChooseCollectionProps = {
  snippet: Snippet;
  collection_id: string;
};

type CollectionUpdateData = {
  id: string;
  user_id: string;
  snippet?: Snippet;
};

export const DialogChooseCollection = forwardRef(
  ({ snippet, collection_id }: DialogChooseCollectionProps, ref) => {
    const [isVisible, setVisible] = useState(false);
    const user = useUserStore((state) => state.user);

    const { data: collections } = useQuery({
      queryKey: ["collections"],
      queryFn: () => fetchCollections(),
    });

    const queryClient = useQueryClient();

    const handleUpdateCollection = useMutation(updateCollection, {


      // onMutate: async (newCollection) => {
      //   await queryClient.cancelQueries({ queryKey: ["collections"] });

      //   const optimisticCollection = { newCollection };

      //   queryClient.setQueryData(["collections"], (old: Collection[]) => [
      //     ...old,
      //     optimisticCollection,
      //   ]);

      //   return { optimisticCollection };
      // },
      // onSuccess: (result, variables, context) => {
      //   queryClient.setQueryData(["collections"], (old: Collection[]) =>
      //     old.map((collection) =>
      //       collection.id === context?.optimisticCollection.newCollection.id
      //         ? result
      //         : collection
      //     )
      //   );
      // },
      // onError: (err, newCollection, context) => {
      //   queryClient.setQueryData(
      //     ["collections"],
      //     context?.optimisticCollection
      //   );
      // },§
      // onSettled: () => {
      //   queryClient.invalidateQueries({ queryKey: ["collections"] });
      // },
    });

    const openDialog = useCallback(() => {
      setVisible(true);
    }, []);

    const closeDialog = useCallback(() => {
      setVisible(false);
    }, []);

    useImperativeHandle(ref, () => ({
      openDialog,
      closeDialog,
    }));

    return (
      <Dialog open={isVisible}>
        <DialogContent
          className="w-full md:max-w-[720px]"
          onInteractOutside={closeDialog}
          onEscapeKeyDown={closeDialog}
        >
          <DialogHeader>Choose a collection</DialogHeader>

          <div className="w-full">
            {collections && collections.data.length === 0 && (
              <div className="flex justify-center px-24">
                <CollectionsEmptyState />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 my-4 w-full">
              {collections &&
                collections.data.length >= 1 &&
                collections.data
                  ?.sort((a: Collection, b: Collection) =>
                    a.title.localeCompare(b.title)
                  )
                  .map((collection: Collection) => (
                    <CollectionCard
                      key={collection.id}
                      id={collection.id}
                      title={collection.title}
                      snippets={collection.snippets}
                      onSelect={() =>
                        handleUpdateCollection.mutate({
                          id: collection.id || "",
                          user_id: user?.id || "",
                          snippet: snippet,
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
