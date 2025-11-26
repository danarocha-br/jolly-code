import { cn } from "@/lib/utils";
import { resizableButton } from "./styles";

export const ResizableHandle = ({ direction }: { direction: string }) => {
  return (
    <div
      className={cn(
        resizableButton(),
        direction === "right" ? "-right-4" : "-left-4"
      )}
    >
      <i className="ri-draggable text-md"></i>
    </div>
  );
};
