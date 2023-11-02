"use client";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useUserStore } from "@/app/store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCollection } from "../db-helpers";

type Collection = {
  title: string;
};

export function CreateCollectionDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [title, setTitle] = useState("");
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const queryKey = ["collections"];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  // const createCollectionMutation = useMutation(
  //   async (title: string) =>
  //     await createCollection({
  //       user_id: user?.id!,
  //       title,
  //     }),
  //   {
  //     onMutate: async (updatedCollection) => {
  //       await queryClient.cancelQueries(queryKey);

  //       const previousState = queryClient.getQueryData(queryKey);

  //       const newCollection: Collection = {
  //         title,
  //       };

  //       queryClient.setQueryData<Collection[] | undefined>(
  //         queryKey,
  //         (oldState) => {
  //           return [...(oldState ?? []), newCollection];
  //         }
  //       );

  //       return { previousState };
  //     },

  //     onError: (err, variables, context) => {
  //       const { previousState } = context as { previousState: Collection[] };

  //       queryClient.setQueryData(queryKey, previousState);
  //     },

  //     onSettled: () => {
  //       queryClient.invalidateQueries(queryKey);
  //     },
  //   }
  // );

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
          {/* <Button
            variant="outline"
          >
            Cancel
          </Button> */}
          <Button
            disabled={!title}
            // onClick={() => createCollectionMutation.mutate(title)}
          >
            Save collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
