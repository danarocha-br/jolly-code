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
import { Label } from "@/components/ui/label/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCollection } from "../queries";
import { Collection } from "../dtos";
import { analytics } from "@/lib/services/analytics";

export function CreateCollectionDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [title, setTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const user = useUserStore((state) => state.user);

  const queryClient = useQueryClient();
  const queryKey = ["collections"];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  const { mutate: handleCreateCollection } = useMutation({
    mutationFn: createCollection,
    onSuccess: (data, variables) => {
      analytics.track("create_collection", {
        title: variables.title,
      });
    },
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Collection[] };

      queryClient.setQueryData(queryKey, previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateCollection({
                  title: title,
                  user_id: user?.id ?? "",
                });
                setIsDialogOpen(false);
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={!title}
            onClick={() => {
              handleCreateCollection({ title: title, user_id: user?.id ?? "" });
              setIsDialogOpen(false);
            }}
          >
            Save collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
