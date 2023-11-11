"use client";
import { useQuery } from "@tanstack/react-query";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/app/store";
import { CollectionsEmptyState } from "./ui/snippet-empty-state";
import { SnippetCallout } from "./ui/snippet-callout";
import { SnippetsList } from "./snippet-list";
import { fetchSnippets } from "./db-helpers";
import { Snippet } from "./dtos";

type SnippetsListProps = {
  isLoading: boolean;
  snippets: {
    data: Snippet[] | [];
  };
};

function SnippetsCollection({ isLoading, snippets }: SnippetsListProps) {
  return (
    <>
      {isLoading ? (
        <div className="flex flex-col p-4 justify-center items-center gap-4">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : !snippets ? (
        <CollectionsEmptyState />
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)] flex flex-col pr-2">
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
    <section>
      {!!user ? (
        <SnippetsCollection
          isLoading={isLoading}
          snippets={snippets || { data: [] }}
        />
      ) : (
        <SnippetCallout />
      )}
    </section>
  );
}
