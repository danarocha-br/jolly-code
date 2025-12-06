"use client";

import { Button } from "@/components/ui/button";

interface ShareTabPreviewProps {
  ogPreviewUrl: string | null;
  isGenerating: boolean;
  onRefresh: () => void;
}

export const ShareTabPreview = ({
  ogPreviewUrl,
  isGenerating,
  onRefresh,
}: ShareTabPreviewProps) => {
  return (
    <div className="space-y-4 px-4 pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm">Open Graph preview generated from your first slide.</p>
          <p className="text-xs text-muted-foreground">
            Cached for an hour. Refresh if you just updated the animation.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onRefresh}
          disabled={isGenerating}
        >
          Refresh preview
        </Button>
      </div>

      <div className="rounded-xl border bg-muted/30 overflow-hidden">
        {ogPreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ogPreviewUrl}
            alt="OG preview"
            className="w-full h-[280px] object-cover bg-muted"
          />
        ) : (
          <div className="w-full h-[280px] flex items-center justify-center text-muted-foreground">
            Generate a link to see the OG image.
          </div>
        )}
      </div>
    </div>
  );
};
