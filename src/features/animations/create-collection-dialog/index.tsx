"use client";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useUserStore } from "@/app/store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label/index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAnimationCollection } from "../queries";
import { AnimationCollection } from "../dtos";
import { trackAnimationEvent } from "@/features/animation/analytics";

export function CreateAnimationCollectionDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [title, setTitle] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const user = useUserStore((state) => state.user);

  const queryClient = useQueryClient();
  const queryKey = ["animation-collections"];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  const { mutate: handleCreateCollection } = useMutation({
    mutationFn: createAnimationCollection,
    onSuccess: (data, variables) => {
      trackAnimationEvent("create_animation_collection", user, {
        title: variables.title,
      });
      trackAnimationEvent("animation_collection_created", user, {
        collection_id: data?.data?.id,
        title: variables.title,
      });
    },
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: AnimationCollection[] };

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
        <DialogHeader>
          <DialogTitle>Use collections to organize your animations.</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col w-full gap-2 my-4">
          <Label htmlFor="animation-collection" className="mb-2">
            Collection name
          </Label>
          <Input
            id="animation-collection"
            placeholder="Demo reels..."
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
