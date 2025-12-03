import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import * as EditorStyles from "@/features/code-editor/styles";

type AnimationBookmarkButtonProps = {
  isAnimationSaved: boolean;
  onSave: () => void;
  onRemove: () => void;
  disabled?: boolean;
  onDark?: boolean;
  compact?: boolean;
};

export function AnimationBookmarkButton({
  isAnimationSaved,
  onSave,
  onRemove,
  disabled = false,
  onDark = true,
  compact = false,
}: AnimationBookmarkButtonProps) {
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={disabled}
      onClick={isAnimationSaved ? onRemove : onSave}
      className={cn(
        EditorStyles.bookmarkButton({ onDark }),
        compact ? "top-1 right-1" : "top-2 right-2"
      )}
    >
      <i className={isAnimationSaved ? "ri-bookmark-fill" : "ri-bookmark-line"} />
    </Button>
  );
}
