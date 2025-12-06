"use client";

import { Button } from "@/components/ui/button";
import { VideoExporter } from "../video-exporter";
// Assuming VideoExporter props are exported or inferred. 
// If not, I might need to just pass props through or import the type if available.
// For now, I'll rely on the usage in the original file.

interface ExportOverlayProps {
  progress: number;
  cancelExport: boolean;
  slides: any[]; // Better to strict type this
  settings: any;
  editorSettings: any;
  onCancel: () => void;
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob) => void;
  onError: (err: Error) => void;
  onCancelled: () => void;
}

export const ExportOverlay = ({
  progress,
  cancelExport,
  slides,
  settings,
  editorSettings,
  onCancel,
  onProgress,
  onComplete,
  onError,
  onCancelled,
}: ExportOverlayProps) => {
  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
      <div className="w-full max-w-md space-y-4 py-4 bg-card border rounded-xl shadow-lg">
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Generating video...</h3>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Please wait while we render your animation frame by frame.
          </p>
        </div>
        <div className="flex justify-center border-t pt-2 -mb-2 px-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={onCancel}
            disabled={cancelExport}
          >
            {cancelExport ? "Cancelling..." : "Cancel export"}
          </Button>
        </div>
      </div>

      <VideoExporter
        slides={slides}
        settings={settings}
        editorSettings={editorSettings}
        onProgress={onProgress}
        onComplete={onComplete}
        onError={onError}
        cancelled={cancelExport}
        onCancelled={onCancelled}
      />
    </div>
  );
};
