import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { CollectionCard } from "@/components/ui/collection-card";
import { useUserStore } from "@/app/store";
import { fetchCollections, updateCollection } from "../db-helpers";
import { Collection, Snippet } from "../dtos";
import { CollectionsEmptyState } from "../ui/snippet-empty-state";
import { SnippetData } from "@/components/ui/code-editor/editor";

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
    const user = useUserStore((state) => state.user);
    const queryKey = ["collections"];

    const { data: collections } = useQuery({
      queryKey,
      queryFn: () => fetchCollections(),
    });

    const queryClient = useQueryClient();

    const { mutate: handleUpdateCollection } = useMutation({
      mutationFn: updateCollection,
      onError: (err, variables, context) => {
        const { previousState } = context as { previousState: Collection[] };

        queryClient.setQueryData(queryKey, previousState);
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
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
