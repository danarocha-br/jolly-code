
import { Button } from "@/components/ui/button";
import { CreateCollectionDialog } from "../create-collection-dialog";
import * as S from "./styles";

export function SnippetCallout() {
  return (
    <div className="w-full pr-5 mt-12">
      <div className={S.emptyContainer()}>
        <div className={S.emptyCard()}>
          <div className={S.emptyIcon()}>
            <i className="ri-bookmark-line" />
          </div>

          <div className="flex flex-col gap-2 mt-8 w-full">
            <div className={S.emptyLines()} />
            <div className={S.emptyLines()} />
          </div>
        </div>

        <h4 className="text-foreground/90">Saved snippets</h4>

        <p className={S.emptyDescription()}>
          Save your code snippets for future reference directly in the tool.
        </p>

        <CreateCollectionDialog>
          <Button variant="secondary" className="w-[220px]">
            Login
          </Button>
        </CreateCollectionDialog>
      </div>
    </div>
  );
}
