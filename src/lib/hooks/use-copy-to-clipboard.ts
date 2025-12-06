import { useCallback, useState } from "react";
import { toast } from "sonner";

type CopyOptions = {
  successMessage?: string;
  errorMessage?: string;
};

export const useCopyToClipboard = (options: CopyOptions = {}) => {
  const [isCopying, setIsCopying] = useState(false);

  const copy = useCallback(
    async (value: string) => {
      if (!value) {
        toast.error(options.errorMessage ?? "Nothing to copy yet.");
        return;
      }

      setIsCopying(true);
      try {
        await navigator.clipboard.writeText(value);
        toast.success(options.successMessage ?? "Copied to clipboard.");
      } catch (error) {
        console.error("Failed to copy value", error);
        toast.error(options.errorMessage ?? "Unable to copy. Please try again.");
      } finally {
        setIsCopying(false);
      }
    },
    [options.errorMessage, options.successMessage]
  );

  return { copy, isCopying };
};
