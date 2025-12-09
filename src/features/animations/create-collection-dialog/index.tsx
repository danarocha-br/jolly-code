"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { useUserStore } from "@/app/store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UpgradeDialog } from "@/components/ui/upgrade-dialog";
import { createAnimationCollection } from "../queries";
import { AnimationCollection } from "../dtos";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { useUserUsage } from "@/features/user/queries";

const formSchema = z.object({
  title: z.string().min(1, { message: "Collection name is required." }),
});

export function CreateAnimationCollectionDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const { data: usage } = useUserUsage(user?.id);

  const queryClient = useQueryClient();
  const queryKey = ["animation-collections"];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

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
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err, variables, context) => {
      const { previousState } = context as {
        previousState: AnimationCollection[];
      };

      queryClient.setQueryData(queryKey, previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    },
  });

  const folderLimit = usage?.folders;
  const folderLimitReached =
    folderLimit?.max != null && folderLimit.current >= folderLimit.max;

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (folderLimitReached) {
      trackAnimationEvent("limit_reached", user, {
        limit_type: "folders",
        current: folderLimit.current,
        max: folderLimit.max,
      });
      setIsDialogOpen(false);
      setIsUpgradeOpen(true);
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "folders",
        trigger: "create_collection",
      });
      return;
    }

    handleCreateCollection({
      title: data.title,
      user_id: user?.id ?? "",
    });
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && folderLimitReached) {
      trackAnimationEvent("limit_reached", user, {
        limit_type: "folders",
        current: folderLimit?.current ?? 0,
        max: folderLimit?.max ?? 0,
      });
      setIsUpgradeOpen(true);
      trackAnimationEvent("upgrade_prompt_shown", user, {
        limit_type: "folders",
        trigger: "create_collection",
      });
      return;
    }
    setIsDialogOpen(nextOpen);
  };

  return (
    <>
      <UpgradeDialog
        open={isUpgradeOpen}
        onOpenChange={setIsUpgradeOpen}
        limitType="folders"
        currentCount={usage?.folders.current ?? 0}
        maxCount={usage?.folders.max ?? null}
        currentPlan={usage?.plan ?? "free"}
      />
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Use collections to organize your animations
            </DialogTitle>
          </DialogHeader>

          <form
            id="create-collection-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-4"
          >
            <FieldGroup>
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel
                      className="whitespace-nowrap"
                      htmlFor="collection-title"
                    >
                      Collection name
                    </FieldLabel>
                    <Input
                      {...field}
                      id="collection-title"
                      aria-invalid={fieldState.invalid}
                      placeholder="Demo reels..."
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button type="submit" form="create-collection-form">
              Save collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
