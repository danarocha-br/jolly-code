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

type CollectionItemProps = {
  title: string;
  language: string;
  onSnippetClick: () => void;
  onMoveToFolder?: () => void;
};

export function CollectionItem({
  title,
  onMoveToFolder,
  language,
  onSnippetClick,
}: CollectionItemProps) {
  return (
    <li className={S.snippet()}>
      <button className="flex gap-1 items-center" onClick={onSnippetClick}>
        <div className="flex items-center gap-2 px-3 py-1">
          <span className="scale-75 -ml-3">
            {languagesLogos[language as keyof typeof languagesLogos]}
          </span>
        </div>

        <p className="flex-2 truncate">{title}</p>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="opacity-0 group-hover/snippet:opacity-100 transition-opacity"
          >
            <i className="ri-more-line text-lg" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onMoveToFolder}>
            <i className="ri-folder-line mr-3" /> Move to collection
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="">
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
