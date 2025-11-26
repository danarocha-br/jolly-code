import { CreateCollectionDialog } from "../create-collection-dialog";
import * as S from "./styles";

export function CollectionsEmptyState() {
  return (
    <div className="w-full relative px-4">
      <div className={S.emptyContainer()}>
        <div className={S.emptyIcon()}>
          <i className="ri-bookmark-line" />
        </div>

        <div className={S.emptyCard()}>
          <div className="flex flex-col gap-2 w-full mt-9">
            <div className={S.emptyLines()} />
            <div className={S.emptyLines()} />
          </div>
        </div>

        <h4 className="text-foreground/90 relative -top-5">
          No saved snippets yet
        </h4>

        <p className={S.emptyDescription()}>
          Start by creating a folder or saving a code snippet.
        </p>

        <CreateCollectionDialog>
          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 w-[220px]">
            Create a folder
          </button>
        </CreateCollectionDialog>
      </div>
    </div>
  );
}
