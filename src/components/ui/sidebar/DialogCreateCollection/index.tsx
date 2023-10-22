import React, { useState } from "react";
import { useMutation, useQueryClient } from "react-query";

import { useUserStore } from "@/app/store";
import { Collection } from "@/lib/services/database";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "../../dialog";
import { Button } from "../../button";
import { createCollection } from "../helpers";
import { Input } from "../../input";
import { Label } from "../../label";

type CollectionData = {
  title: string;
};

export const DialogCreateCollection = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [title, setTitle] = useState("");
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  queryClient.setMutationDefaults(["addCollection"], {
    mutationFn: async ({ title }: CollectionData) => {
      return await createCollection({
        user_id: user?.id!,
        title,
      });
    },
    onMutate: async (newCollection) => {
      await queryClient.cancelQueries({ queryKey: ["collections"] });

      const previousCollection = queryClient.getQueryData(["collections"]);

      queryClient.setQueryData(
        ["collections"],
        (old: Collection[] | undefined) => [...(old || []), newCollection]
      );

      return { previousCollection };
    },

    onError: (err, newCollection, context) => {
      queryClient.setQueryData(["collections"], context.previousCollection);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const handleCreateCollection = useMutation<
    CollectionData,
    unknown,
    CollectionData,
    unknown
  >({
    mutationKey: ["addCollection"],
  });

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>Use collections to organize your snippets.</DialogHeader>

        <div className="flex flex-col w-full gap-2 my-4">
          <Label htmlFor="collection" className="mb-2">
            Collection name
          </Label>
          <Input
            id="collection"
            placeholder="Javascript ..."
            onChange={handleChange}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleCreateCollection.mutate({ title })}
          >
            Cancel
          </Button>
          <Button onClick={() => handleCreateCollection.mutate({ title })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
