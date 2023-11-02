'use client';
import { useQuery } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store";
import { CollectionsEmptyState } from "./ui/snippet-empty-state";
import { SnippetsList } from "./snippet-list";
import { fetchSnippets } from "./db-helpers";
import { Snippet } from "./dtos";
import { SnippetCallout } from './ui/snippet-callout';

type SnippetsListProps = {
  isLoading: boolean;
  snippets: {
    data: Snippet[] | [];
  };
};

function ShowSnippets({ isLoading, snippets }: SnippetsListProps) {
  return (
    <>
      {isLoading ? (
        <div className="w-[calc(100%-16px)] flex flex-col p-8 justify-center items-center gap-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : !snippets ? (
        <CollectionsEmptyState />
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)] w-[calc(100%-16px)] mt-8 flex flex-col justify-center">
          <SnippetsList
            data={Array.isArray(snippets?.data ?? []) ? snippets.data : []}
          />
        </ScrollArea>
      )}
    </>
  );
}

export function Snippets() {
  const user = useUserStore((state) => state.user);

  const { isLoading, data: snippets } = useQuery<{ data: Snippet[] }>({
    queryKey: ["snippets"],
    queryFn: fetchSnippets,
    enabled: !!user,
  });

  return (
    <section className="w-full pl-4">
      {!!user ? (
        <ShowSnippets
          isLoading={isLoading}
          snippets={snippets || { data: [] }}
        />
      ) : (
        <SnippetCallout />
      )}
    </section>
  );
}
