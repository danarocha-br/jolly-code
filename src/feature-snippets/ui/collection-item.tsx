import { languagesLogos } from "@/lib/language-logos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import * as S from "./styles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeSnippet } from "../db-helpers";
import { Snippet } from "../dtos";
import { useUserStore } from "@/app/store";

type CollectionItemProps = {
  id: string;
  title: string;
  language: string;
  onSnippetClick: () => void;
  onMoveToFolder: () => void;
};

export function CollectionItem({
  id,
  title,
  onMoveToFolder,
  language,
  onSnippetClick,
}: CollectionItemProps) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const { mutate: handleDeleteSnippet } = useMutation({
    mutationFn: removeSnippet,
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Snippet };

      queryClient.setQueryData(["snippets"], previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
  });

  return (
    <li className={S.snippet()}>
      <button
        className="flex items-center gap-2 w-full"
        onClick={() => onSnippetClick()}
      >
        <span className="scale-75">
          {languagesLogos[language as keyof typeof languagesLogos]}
        </span>

        <p className="flex-2 truncate capitalize">{title}</p>
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
          <DropdownMenuItem onClick={() => onMoveToFolder()}>
            <i className="ri-folder-line mr-3" /> Move to collection
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              handleDeleteSnippet({ snippet_id: id, user_id: user?.id })
            }
          >
            <div>
              <i className="ri-bookmark-2-line mr-3" />
              Remove
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
