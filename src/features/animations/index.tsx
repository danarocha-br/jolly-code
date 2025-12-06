"use client";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area/index";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store";
import { AnimationCollectionsEmptyState } from "./ui/animation-empty-state";
import { AnimationCallout } from "./ui/animation-callout";
import { AnimationsList } from "./animation-list";
import { fetchAnimationCollections } from "./queries";
import { AnimationCollection } from "./dtos";

type AnimationsListProps = {
  collections: AnimationCollection[] | [];
  isRefetching: boolean;
};

function AnimationsCollection({ collections, isRefetching }: AnimationsListProps) {
  return (
    <>
      {collections.length === 0 ? (
        <AnimationCollectionsEmptyState />
      ) : (
        <Suspense
          fallback={
            <div className="flex flex-col p-4 justify-center items-center gap-4">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          }
        >
          <ScrollArea className="h-[calc(100vh-200px)] flex flex-col pr-2">
            <AnimationsList
              collections={collections}
              isRefetching={isRefetching}
            />
          </ScrollArea>
        </Suspense>
      )}
    </>
  );
}

export function Animations() {
  const user = useUserStore((state) => state.user);

  const {
    data: collections,
    isLoading,
    isRefetching,
    error,
  } = useQuery<AnimationCollection[]>({
    queryKey: ["animation-collections"],
    queryFn: fetchAnimationCollections,
    enabled: !!user,
  });

  return (
    <section>
      {!!user && !isLoading && !error ? (
        <AnimationsCollection
          collections={collections || []}
          isRefetching={isRefetching}
        />
      ) : isLoading ? (
        <div className="flex flex-col p-4 justify-center items-center gap-4">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : error ? (
        <div className="flex flex-col p-4 justify-center items-center gap-4">
          <i className="ri-error-warning-line text-4xl text-destructive" />
          <p className="text-sm text-muted-foreground">
            Failed to load collections. Please try again.
          </p>
        </div>
      ) : (
        <AnimationCallout />
      )}
    </section>
  );
}
