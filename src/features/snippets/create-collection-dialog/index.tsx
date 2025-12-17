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
import { createCollection } from "../queries";
import { Collection } from "../dtos";
import { analytics } from "@/lib/services/tracking";
import { useUserUsage, USAGE_QUERY_KEY } from "@/features/user/queries";
import { getUsageLimitsCacheProvider } from "@/lib/services/usage-limits-cache";

const formSchema = z.object({
  title: z.string().min(1, { message: "Collection name is required." }),
});

export function CreateCollectionDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const { data: usage } = useUserUsage(user?.id);

  const queryClient = useQueryClient();
  const queryKey = ["collections"];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const { mutate: handleCreateCollection } = useMutation({
    mutationFn: createCollection,
    onSuccess: (data, variables) => {
      analytics.track("create_collection", {
        title: variables.title,
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Collection[] };

      queryClient.setQueryData(queryKey, previousState);
    },

    onSettled: () => {
      // Clear the usage limits cache BEFORE any query invalidation to prevent race condition
      // This must happen synchronously before invalidateQueries triggers refetch
      if (user?.id) {
        const cacheProvider = getUsageLimitsCacheProvider();
        cacheProvider.delete(user.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKey });
      if (user?.id) {
        // Invalidate after cache is cleared to ensure fresh data
        queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, user.id] });
      }
    },
  });

  const folderLimit = usage?.folders;
  const folderLimitReached =
    folderLimit?.max !== null &&
    typeof folderLimit?.max !== "undefined" &&
    folderLimit.current >= folderLimit.max;

  function onSubmit(data: z.infer<typeof formSchema>) {
    if (!usage) {
      // Usage data not loaded yet - optionally wait or show loading state
      return;
    }
    if (folderLimitReached) {
      analytics.track("limit_reached", {
        limit_type: "folders",
        current: folderLimit.current,
        max: folderLimit.max,
      });
      setIsDialogOpen(false);
      setIsUpgradeOpen(true);
      analytics.track("upgrade_prompt_shown", {
        limit_type: "folders",
        trigger: "create_collection",
      });
      return;
    }

    if (!user?.id) {
      return;
    }

    handleCreateCollection({
      title: data.title,
      user_id: user?.id,
    });
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && folderLimitReached) {
      analytics.track("limit_reached", {
        limit_type: "folders",
        current: folderLimit?.current ?? 0,
        max: folderLimit?.max ?? 0,
      });
      setIsUpgradeOpen(true);
      analytics.track("upgrade_prompt_shown", {
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
              Use collections to organize your snippets.
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
                      placeholder="Javascript ..."
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
