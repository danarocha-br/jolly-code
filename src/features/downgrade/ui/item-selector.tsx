import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { Snippet } from "@/features/snippets/dtos";
import type { Animation } from "@/features/animations/dtos";
import { Skeleton } from "@/components/ui/skeleton";

type BaseItem = {
  id: string;
  title?: string;
  created_at?: string | number;
};

type ItemSelectorProps<T extends BaseItem> = {
  label: string;
  items: T[];
  selectedItems: Set<string>;
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  isLoading: boolean;
  getItemTitle: (item: T) => string;
  getItemSubtitle?: (item: T) => string;
};

export function ItemSelector<T extends BaseItem>({
  label,
  items,
  selectedItems,
  onToggleSelection,
  onClearSelection,
  isLoading,
  getItemTitle,
  getItemSubtitle,
}: ItemSelectorProps<T>) {
  const selectedCount = selectedItems.size;
  const totalItems = items.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between h-8">
        <p className="text-sm font-medium">
          {label} ({selectedCount} selected)
        </p>
        {selectedCount > 0 && (
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear Selection
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-full bg-card dark:bg-muted" />
          <Skeleton className="h-6 w-full bg-card dark:bg-muted" />
        </div>
      ) : (
        <ScrollArea className="h-auto border rounded-lg p-2">
          <div className="space-y-2">
            {!items || items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No {label.toLowerCase()} found
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded hover:bg-card dark:hover:bg-muted/50 cursor-pointer"
                  onClick={() => onToggleSelection(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleSelection(item.id);
                    }
                  }}
                  tabIndex={0}
                  role="checkbox"
                  aria-checked={selectedItems.has(item.id)}
                  aria-labelledby={`item-title-${item.id}`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => onToggleSelection(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-labelledby={`item-title-${item.id}`}
                    />

                    <p
                      id={`item-title-${item.id}`}
                      className="text-sm font-medium truncate"
                    >
                      {getItemTitle(item)}
                    </p>
                  </div>
                  {getItemSubtitle && (
                    <p className="text-xs text-muted-foreground">
                      {getItemSubtitle(item)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// Specific implementations for snippets and animations
export function SnippetSelector({
  snippets,
  selectedSnippets,
  onToggleSelection,
  onClearSelection,
  isLoading,
}: {
  snippets: Snippet[];
  selectedSnippets: Set<string>;
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  isLoading: boolean;
}) {
  return (
    <ItemSelector
      label="Snippets"
      items={snippets}
      selectedItems={selectedSnippets}
      onToggleSelection={onToggleSelection}
      onClearSelection={onClearSelection}
      isLoading={isLoading}
      getItemTitle={(snippet) => snippet.title || "Untitled"}
      getItemSubtitle={(snippet) =>
        `${snippet.language} • ${new Date(snippet.created_at || 0).toLocaleDateString()}`
      }
    />
  );
}

export function AnimationSelector({
  animations,
  selectedAnimations,
  onToggleSelection,
  onClearSelection,
  isLoading,
}: {
  animations: Animation[];
  selectedAnimations: Set<string>;
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  isLoading: boolean;
}) {
  return (
    <ItemSelector
      label="Animations"
      items={animations}
      selectedItems={selectedAnimations}
      onToggleSelection={onToggleSelection}
      onClearSelection={onClearSelection}
      isLoading={isLoading}
      getItemTitle={(animation) => animation.title || "Untitled"}
      getItemSubtitle={(animation) =>
        new Date(animation.created_at || 0).toLocaleDateString()
      }
    />
  );
}

export function FolderSelector({
  folders,
  selectedFolders,
  onToggleSelection,
  onClearSelection,
  isLoading,
}: {
  folders: BaseItem[];
  selectedFolders: Set<string>;
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  isLoading: boolean;
}) {
  return (
    <ItemSelector
      label="Folders"
      items={folders}
      selectedItems={selectedFolders}
      onToggleSelection={onToggleSelection}
      onClearSelection={onClearSelection}
      isLoading={isLoading}
      getItemTitle={(folder) => folder.title || "Untitled Folder"}
      getItemSubtitle={(folder) =>
        new Date(folder.created_at || 0).toLocaleDateString()
      }
    />
  );
}
