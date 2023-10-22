import React from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from "../../dialog";
import { fetchCollections } from "../../sidebar/helpers";
import { Collection } from "@/lib/services/database";
import { CollectionsEmptyState } from "../../sidebar/snippets";
import { CollectionCard } from "../../collection-card";
import { useUserStore } from "@/app/store";
import { updateCollection } from "../helpers";
import { toast } from 'sonner';

const DialogChooseCollection = ({
  children,
  toastId,
  snippet
}: {
  children: React.ReactNode;
  }) => {

  const { data: collections } = useQuery("collections", fetchCollections);
  const queryClient = useQueryClient();

  const user = useUserStore((state) => state.user);

  setTimeout(() => {
    toast.dismiss(toastId);
  }, 1000);

  queryClient.setMutationDefaults(["updateCollection"], {
    mutationFn: async ({ id, title, snippets }: Collection) => {
      return await updateCollection({
        id: id || "",
        user_id: user?.id,
        title,
        snippets: snippets || [],
      });
    },
    onMutate: async (newCollection) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] });

      const previousCollection = queryClient.getQueryData([
        "collections",
        newCollection.id,
      ]);

      queryClient.setQueryData(
        ["collections", newCollection.id],
        newCollection
      );

      return { previousCollection, newCollection };
    },

    onError: (err, newCollection, context) => {
      queryClient.setQueryData(["collections"], context.previousCollections);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const handleUpdateCollection = useMutation<
    Collection,
    unknown,
    Collection,
    unknown
  >({
    mutationKey: ["updateCollection"],
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-full md:max-w-[720px]">
        <DialogHeader>Choose a collection</DialogHeader>

        <div className="flex">
          <div className="grid grid-cols-3 gap-3 my-4 w-full">
            {collections && collections.data.length > 0 ? (
              collections.data.map((collection: Collection) => (
                <CollectionCard
                  key={collection.id}
                  id={collection.id}
                  title={collection.title}
                  snippets={collection.snippets}
                  onSelect={() =>
                    handleUpdateCollection.mutate({ id: collection.id! })
                  }
                />
              ))
            ) : (
              <div className="w-full ml-6">
                <CollectionsEmptyState />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DialogChooseCollection;
