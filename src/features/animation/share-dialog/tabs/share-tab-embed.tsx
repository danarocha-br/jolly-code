"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { DialogFooter } from "@/components/ui/dialog";

interface ShareTabEmbedProps {
  width: string;
  height: string;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  embedCode: string;
  isGenerating: boolean;
  isCopying: boolean;
  onCopy: () => void;
}

export const ShareTabEmbed = ({
  width,
  height,
  onWidthChange,
  onHeightChange,
  embedCode,
  isGenerating,
  isCopying,
  onCopy,
}: ShareTabEmbedProps) => {
  return (
    <div className="py-2">
      <div className="px-4 space-y-4">
        <FieldGroup className="grid grid-cols-2 gap-4 space-y-0">
          <Field orientation="horizontal">
            <FieldLabel htmlFor="embed-width">Width</FieldLabel>
            <Input
              id="embed-width"
              value={width}
              onChange={(e) => onWidthChange(e.target.value)}
              placeholder="100%"
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="embed-height">Height</FieldLabel>
            <Input
              id="embed-height"
              value={height}
              onChange={(e) => onHeightChange(e.target.value)}
              placeholder="420"
            />
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-2">
          <Label>Embed code</Label>
          <div className="rounded-xl border bg-muted/30 p-3">
            <pre className="text-sm whitespace-pre-wrap break-all font-mono text-muted-foreground">
              {embedCode || "Generate a link to preview the embed snippet."}
            </pre>
          </div>
        </div>
      </div>
      <DialogFooter className="flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4 -mb-2">
        <p className="text-xs text-muted-foreground">
          <i className="ri-information-line mr-2 text-sm"></i>
          Customize the iframe size before copying the embed code.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onCopy}
            disabled={isGenerating || isCopying}
          >
            {isGenerating ? "Generating..." : isCopying ? "Copying..." : "Copy embed"}
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
};
