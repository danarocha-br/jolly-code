import { Suspense } from "react";
import { UseMutateFunction, useQuery } from "@tanstack/react-query";

import { languagesLogos } from "@/lib/language-logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditorStore, useUserStore } from "@/app/store";
import { fetchSnippetById, RemoveSnippetProps } from "../queries";
import { Snippet } from "../dtos";
import * as S from "./styles";

type CollectionItemProps = {
  id: string;
  collectionId: string;
  onItemSelect: (snippet: Snippet) => void;
  onMoveToCollection: (
    snippet: Snippet,
    previous_collection_id: string
  ) => void;
  onDelete: UseMutateFunction<void, Error, RemoveSnippetProps, unknown>;
};

export function CollectionItem({
  id,
  collectionId,
  onItemSelect,
  onDelete,
  onMoveToCollection,
}: CollectionItemProps) {
  const user = useUserStore((state) => state.user);

  const { data: snippet, isLoading, error } = useQuery({
    queryKey: ["snippet", id],
    queryFn: () => fetchSnippetById(id),
    enabled: !!user,
  });

  const editors = useEditorStore((state) => state.editors);

  return isLoading ? (
    <Skeleton />
  ) : error ? (
    null // Don't render anything if there's an error
  ) : snippet ? (
    <li className={S.snippet()}>
      <Suspense fallback={<Skeleton />}>
        <button
          className="flex items-center gap-2 w-full"
          onClick={() => onItemSelect(snippet)}
        >
          <span className="scale-75">
            {snippet &&
              languagesLogos[snippet.language as keyof typeof languagesLogos]}
          </span>

          {snippet && (
            <p className="flex-2 truncate capitalize">{snippet.title}</p>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity !-mr-3"
            >
              <i className="ri-more-line text-lg" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onMoveToCollection({ ...snippet }, collectionId)}
            >
              <i className="ri-folder-line mr-3" /> Move to collection
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                useEditorStore.setState({
                  editors: editors.map((editor) => {
                    if (editor.id === id) {
                      return {
                        ...editor,
                        isSnippetSaved: false,
                      };
                    }
                    return editor;
                  }),
                });
                onDelete({ snippet_id: id, user_id: user?.id });
              }}
            >
              <div>
                <i className="ri-bookmark-2-line mr-3" />
                Remove
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Suspense>
    </li>
  ) : null;
}
