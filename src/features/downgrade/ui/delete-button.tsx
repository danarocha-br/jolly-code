import { Button } from "@/components/ui/button";

type DeleteButtonProps = {
  selectedCount: number;
  isDeleting: boolean;
  onDelete: () => void;
};

export function DeleteButton({ selectedCount, isDeleting, onDelete }: DeleteButtonProps) {
  if (selectedCount === 0) return null;

  return (
    <Button
      variant="destructive"
      onClick={onDelete}
      disabled={isDeleting}
      className="w-full"
    >
      {isDeleting ? (
        <>
          <i className="ri-loader-4-line text-lg mr-2 animate-spin" />
          Deleting...
        </>
      ) : (
        <>
          <i className="ri-delete-bin-line text-lg mr-2" />
          Delete selected ({selectedCount} items)
        </>
      )}
    </Button>
  );
}
