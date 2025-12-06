"use client";

import { useMemo } from "react";
import { SiHashnode, SiMedium, SiNotion, SiDevdotto } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareTabPlatformsProps {
  shareUrl: string;
  isExporting: boolean;
  isCopyingSnippet: boolean;
  onExport: () => void;
  onPlatformCopy: (platform: "hashnode" | "medium" | "devto" | "notion") => void;
}

export const ShareTabPlatforms = ({
  shareUrl,
  isExporting,
  isCopyingSnippet,
  onExport,
  onPlatformCopy,
}: ShareTabPlatformsProps) => {
  const platformButtons = useMemo(
    () => [
      { key: "hashnode", label: "Hashnode", icon: <SiHashnode /> },
      { key: "medium", label: "Medium", icon: <SiMedium /> },
      { key: "devto", label: "Dev.to", icon: <SiDevdotto /> },
      { key: "notion", label: "Notion", icon: <SiNotion /> },
    ],
    []
  );

  return (
    <div className="space-y-4 mt-3">
      <div className="space-y-1 px-4">
        <h4 className="text-sm font-medium">Download Video</h4>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Download a high-quality video of your animation to share on any platform.
          </p>
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={onExport}
            disabled={isExporting}
            className="whitespace-nowrap"
          >
            <i className="ri-download-line mr-2"></i>
            Download Video
          </Button>
        </div>
      </div>

      <div className="space-y-3 pt-4 px-4 border-t">
        <h4 className="text-sm font-medium">Embed Links</h4>
        <p className="text-sm text-muted-foreground">
          Or copy platform-specific embed snippets.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {platformButtons.map((platform) => (
            <Button
              key={`embed-${platform.key}`}
              type="button"
              variant="secondary"
              className={cn("gap-2")}
              onClick={() =>
                onPlatformCopy(platform.key as "hashnode" | "medium" | "devto" | "notion")
              }
              disabled={!shareUrl || isCopyingSnippet}
            >
              {platform.icon}
              {platform.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
