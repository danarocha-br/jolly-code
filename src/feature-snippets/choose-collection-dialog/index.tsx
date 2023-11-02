import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { useUserStore } from "@/app/store";
import { Collection } from "@/lib/services/database";
import { Snippet } from "../dtos";

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
  user_id: string | undefined;
  snippet?: Snippet;
};

export const DialogChooseCollection = forwardRef(
  ({ snippet, collection_id }: DialogChooseCollectionProps, ref) => {
    const [isVisible, setVisible] = useState(false);

    // const { data } = useQuery("collections", () =>
    //   fetchCollections(snippet.id)
    // );

    // console.log(data);

    // const collections = data && data.data;
    const collections = [];

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

    const queryClient = useQueryClient();

    const user = useUserStore((state) => state.user);

    queryClient.setMutationDefaults(["updateCollection"], {
      mutationFn: async ({ id, user_id, snippet }: CollectionUpdateData) => {
        if (!snippet || typeof snippet !== "object") {
          toast.error("Invalid snippet. Please try again.");
          return;
        }

        return await updateCollection({
          id: id || "",
          user_id,
          //@ts-ignore
          snippet,
        });
      },
      onMutate: async (newCollection) => {
        await queryClient.cancelQueries(["collections"]);

        const previousCollections =
          queryClient.getQueryData<Collection[]>("collections");

        // queryClient.setQueryData<Collection[]>(
        //   "collections",
        //   (oldCollections) => {
        //     if (!Array.isArray(oldCollections)) {
        //       return [];
        //     }
        //     console.log(oldCollections);

        //     return oldCollections.map((collection) => {
        //       if (collection.id === newCollection.id) {
        //         return {
        //           ...collection,
        //           snippets: [
        //             ...(collection.snippets || []),
        //             newCollection.snippet,
        //           ],
        //           snippetCount: (collection.snippets?.length || 0) + 1,
        //         };
        //       }
        //       return collection;
        //     });
        //   }
        // );

        return { previousCollections };
      },

      onError: (err, newCollection, context) => {
        queryClient.setQueryData(["collections"], context.previousCollections);
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["collections"] });
      },
    });

    const handleUpdateCollection = useMutation<
      CollectionUpdateData,
      unknown,
      CollectionUpdateData,
      unknown
    >({
      mutationKey: ["updateCollection"],
    });

    return (
      <Dialog open={isVisible}>
        <DialogContent
          className="w-full md:max-w-[720px]"
          onInteractOutside={closeDialog}
          onEscapeKeyDown={closeDialog}
        >
          <DialogHeader>Choose a collection</DialogHeader>

          <div className="w-full">
            {collections && collections.length === 0 && (
              <div className="flex justify-center px-24">
                <CollectionsEmptyState />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 my-4 w-full">
              {collections &&
                collections.length > 0 &&
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
