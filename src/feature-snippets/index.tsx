"use client";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area/index";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store";
import { CollectionsEmptyState } from "./ui/snippet-empty-state";
import { SnippetCallout } from "./ui/snippet-callout";
import { SnippetsList } from "./snippet-list";
import { fetchCollections } from "./db-helpers";
import { Collection, Snippet } from "./dtos";
import { FollowerPointerCard } from "@/components/ui/cursor-follow";
import { Avatar } from '@/components/ui/avatar';

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
  } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: fetchCollections,
    enabled: !!user,
  });

  return (
    <section className="cursor-none">
      {!!user && !isLoading ? (
        <FollowerPointerCard
          title={
            <div className='flex gap-1 items-center'>
              <Avatar
                imageSrc={user.user_metadata.avatar_url}
                alt={user.user_metadata.full_name}
              />
              <span>{user.user_metadata.full_name}</span>
            </div>
          }
        >
          <SnippetsCollection
            collections={collections || []}
            isRefetching={isRefetching}
          />
        </FollowerPointerCard>
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
