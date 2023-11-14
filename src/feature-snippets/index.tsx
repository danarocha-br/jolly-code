"use client";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store";
import { CollectionsEmptyState } from "./ui/snippet-empty-state";
import { SnippetCallout } from "./ui/snippet-callout";
import { SnippetsList } from "./snippet-list";
import { fetchCollections } from "./db-helpers";
import { Collection, Snippet } from "./dtos";

type SnippetsListProps = {
  collections: {
    data: Collection[] | [];
  };
};

function SnippetsCollection({ collections }: SnippetsListProps) {
  return (
    <>
      {collections.data.length === 0 ? (
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
            <SnippetsList data={collections?.data} />
          </ScrollArea>
        </Suspense>
      )}
    </>
  );
}

export function Snippets() {
  const user = useUserStore((state) => state.user);

  const { isLoading, data: collections } = useQuery<{ data: Snippet[] }>({
    queryKey: ["collections"],
    queryFn: fetchCollections,
    enabled: !!user,
  });

  return (
    <section>
      {!!user && !isLoading ? (
        <SnippetsCollection collections={collections || { data: [] }} />
      ) : isLoading ? (
        <div className="flex flex-col p-4 justify-center items-center gap-4">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <SnippetCallout />
      )}
    </section>
  );
}
