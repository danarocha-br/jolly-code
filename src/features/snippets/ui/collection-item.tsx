import React, { Suspense } from "react";
import { UseMutateFunction, useQuery } from "@tanstack/react-query";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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
  snippet: Snippet;
  collectionId: string;
  onItemSelect: (snippet: Snippet) => void;
  onMoveToCollection: (
    snippet: Snippet,
    previous_collection_id: string
  ) => void;
  onDelete: UseMutateFunction<void, Error, RemoveSnippetProps, unknown>;
  isDragging?: boolean;
  isPendingMove?: boolean;
};

export const CollectionItem = React.memo(function CollectionItem({
  snippet,
  collectionId,
  onItemSelect,
  onDelete,
  onMoveToCollection,
  isDragging = false,
  isPendingMove = false,
}: CollectionItemProps) {
  const user = useUserStore((state) => state.user);
  const editors = useEditorStore((state) => state.editors);

  const { attributes, listeners, setNodeRef, transform, isDragging: draggingSelf } =
    useDraggable({
      id: snippet.id,
      data: {
        snippet,
        collectionId,
      },
    });

  const dragging = isDragging || draggingSelf;
  const isOriginPlaceholder = draggingSelf;
  const style = draggingSelf
    ? { opacity: 0.6 }
    : transform
      ? { transform: CSS.Translate.toString(transform) }
      : undefined;

  return (
    <li
      ref={setNodeRef}
      className={S.snippet({
        dragging,
        origin: isOriginPlaceholder,
        pending: isPendingMove,
      })}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`Drag ${snippet.title} to another collection`}
      data-pending-move={isPendingMove || undefined}
    >
      <Suspense fallback={<Skeleton />}>
        <button
          className="flex items-center justify-start text-left gap-2 w-full"
          onClick={() => {
            if (dragging) return;
            onItemSelect(snippet);
          }}
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
                    if (editor.id === snippet.id) {
                      return {
                        ...editor,
                        isSnippetSaved: false,
                      };
                    }
                    return editor;
                  }),
                });
                onDelete({ snippet_id: snippet.id, user_id: user?.id });
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
  );
});
