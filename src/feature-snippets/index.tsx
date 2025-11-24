"use client";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area/index";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store";
import { CollectionsEmptyState } from "./ui/snippet-empty-state";
import { SnippetCallout } from "./ui/snippet-callout";
import { SnippetsList } from "./snippet-list";
import { fetchCollections } from "./queries";
import { Collection, Snippet } from "./dtos";

type SnippetsListProps = {
  collections: Collection[] | [];
  isRefetching: boolean;
};

function SnippetsCollection({ collections, isRefetching }: SnippetsListProps) {
  return (
    <>
      {collections.length === 0 ? (
        <CollectionsEmptyState />
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
            <SnippetsList
              collections={collections}
              isRefetching={isRefetching}
            />
          </ScrollArea>
        </Suspense>
      )}
    </>
  );
}

export function Snippets() {
  const user = useUserStore((state) => state.user);

  const {
    data: collections,
    isLoading,
    isRefetching,
    error,
  } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: fetchCollections,
    enabled: !!user,
  });

  return (
    <section>
      {!!user && !isLoading && !error ? (
        <SnippetsCollection
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
        <SnippetCallout />
      )}
    </section>
  );
}
