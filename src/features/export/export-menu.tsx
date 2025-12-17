"use client";
import React from "react";
import { toBlob, toJpeg, toPng, toSvg } from "html-to-image";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { hotKeyList } from "@/lib/hot-key-list";
import { useEditorStore, useUserStore } from "@/app/store";
import { analytics } from "@/lib/services/tracking";

type ImageFormat = "SVG" | "PNG" | "JPG";

interface ExportMenuProps {
  // Animation mode props (optional)
  animationMode?: {
    onExport: () => void;
    isExporting: boolean;
    canExport: boolean;
  };
}

const exportSVG = hotKeyList.filter((item) => item.label === "Save as SVG");
const exportPNG = hotKeyList.filter((item) => item.label === "Save as PNG");
const exportJPG = hotKeyList.filter((item) => item.label === "Save as JPG");
const copySnippet = hotKeyList.filter((item) => item.label === "Copy snippet");
const copyImg = hotKeyList.filter((item) => item.label === "Copy image");

export const ExportMenu = ({ animationMode }: ExportMenuProps = {}) => {
  const editors = React.useRef<{ [key: string]: HTMLElement | null }>({});
  const { user } = useUserStore();

  const currentEditorState = useEditorStore(
    (state) => state.currentEditorState
  );
  const { code, title } = useEditorStore(
    useShallow((state) => {
      const editor = state.editors.find(
        (editor) => editor.id === currentEditorState?.id
      );
      return editor
        ? {
          code: editor.code,
          title: editor.title,
        }
        : {
          code: "",
          title: "Untitled",
        };
    })
  );

  const editor = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const currentId = currentEditorState?.id || "editor";
    const editorElement = document.getElementById(currentId);

    if (editorElement) {
      editors.current[currentId] = editorElement;
    }

    return () => {
      // Cleanup logic if needed
    };
  }, [currentEditorState, editors]);

  /**
   * Copies the image from a DOM element to the clipboard.
   *
   * @returns A promise that resolves when the image is successfully copied to the clipboard.
   */
  async function copyImageToClipboard() {
    try {
      const currentId = currentEditorState?.id || "editor";
      const freshEditor = document.getElementById(currentId);
      if (!freshEditor) {
        toast.error("Something went wrong! Please try again.");
        return;
      }

      freshEditor.dataset.exporting = "true";

      const imageBlob = await toBlob(freshEditor!, {
        pixelRatio: 2,
      });

      if (!imageBlob) {
        toast.error("Something went wrong! Please try again.");
        return;
      }

      const image = new ClipboardItem({ "image/png": imageBlob });
      await navigator.clipboard.write([image]);
      toast.success("Image copied to clipboard!");
      analytics.track("copy_image");
    } catch (error) {
      toast.error("Something went wrong! Please try again.");
    } finally {
      const currentId = currentEditorState?.id || "editor";
      const freshEditor = document.getElementById(currentId);
      if (freshEditor) {
        freshEditor.dataset.exporting = "false";
      }
    }
  }

  /**
   * Copies the code to the clipboard.
   *
   * @return {Promise<void>} A promise that resolves when the code is successfully copied to the clipboard.
   */
  async function copyCodeToClipboard() {
    try {
      if (code) {
        await navigator.clipboard.writeText(code);
        toast.success("Code copied to clipboard!");
        analytics.track("copy_code");
      } else {
        toast.error("Code was not copied! Please try again.");
      }
    } catch (err) {
      // Capture and report error with contextual metadata
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
        Sentry.withScope((scope) => {
          scope.setTag("export_type", "copy_code");
          scope.setTag("user_id", user?.id || "unknown");
          scope.setContext("export_error", {
            export_type: "copy_code",
            user_id: user?.id,
            editor_id: currentEditorState?.id,
            editor_title: title,
            code_length: code?.length || 0,
            error_message: error.message,
            error_name: error.name,
          });
          Sentry.captureException(error);
          Sentry.flush(2000).catch((flushError) => {
            console.warn("[Export] Sentry flush failed:", flushError);
          });
        });
      }
      
      toast.error("Something went wrong!");
    }
  }

  /**
   * Handles saving an image with the given name and format.
   *
   * @param {string} name - The name of the image.
   * @param {ImageFormat} format - The format of the image.
   * @return {Promise<void>} - A promise that resolves when the image is saved.
   */
  async function handleSaveImage(name: string, format: ImageFormat) {
    let imageURL, fileName;
    const currentId = currentEditorState?.id || "editor";
    const freshEditor = document.getElementById(currentId);
    if (freshEditor) {
      freshEditor.dataset.exporting = "true";
    }

    try {
      switch (format) {
        case "PNG": {
          imageURL = await toPng(freshEditor!, {
            pixelRatio: 2,
          });
          fileName = `${name}.png`;
          break;
        }

        case "JPG": {
          imageURL = await toJpeg(freshEditor!, {
            pixelRatio: 2,
            backgroundColor: "#fff",
          });
          fileName = `${name}.jpg`;
          break;
        }

        case "SVG": {
          // Convert to PNG first (which works reliably), then wrap in SVG
          // This avoids the known issues with html-to-image's toSvg function
          const pngDataUrl = await toPng(freshEditor!, {
            pixelRatio: 2,
          });

          // Get the dimensions of the element
          const rect = freshEditor!.getBoundingClientRect();
          const width = rect.width * 2; // Account for pixelRatio
          const height = rect.height * 2;

          // Create an SVG that embeds the PNG
          const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image width="${width}" height="${height}" xlink:href="${pngDataUrl}"/>
</svg>`;

          // Convert to data URL
          imageURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
          fileName = `${name}.svg`;
          break;
        }

        default: {
          // If the provided format is not supported, return without doing anything
          return;
        }
      }

      const link = document.createElement("a");
      // Set the link's href to the image URL
      link.href = imageURL;
      // Set the link's download attribute to the file name
      link.download = fileName;
      // Programmatically trigger a click on the link element to initiate the file download
      link.click();
    } finally {
      if (freshEditor) {
        freshEditor.dataset.exporting = "false";
      }
    }
  }

  /**
   * Handles the export of an image in the specified format.
   *
   * @param {ImageFormat} format - The format in which the image should be exported. Possible values are "SVG", "PNG", or "JPG".
   * @return {void} This function does not return anything.
   */
  const handleExport = (format: ImageFormat) => {
    if (title) {
      switch (format) {
        case "SVG":
          toast.promise(handleSaveImage(title, "SVG"), {
            loading: "Exporting SVG image...",
            success: "Successfully exported!",
            error: "Sorry. Something went wrong.",
          });
          analytics.track("export_image", { format: "SVG" });
          break;

        case "PNG":
          toast.promise(handleSaveImage(title, "PNG"), {
            loading: "Exporting PNG image...",
            success: "Successfully exported!",
            error: "Sorry. Something went wrong.",
          });
          analytics.track("export_image", { format: "PNG" });
          break;

        case "JPG":
          toast.promise(handleSaveImage(title, "JPG"), {
            loading: "Exporting JPG image...",
            success: "Successfully exported!",
            error: "Sorry. Something went wrong.",
          });
          analytics.track("export_image", { format: "JPG" });
          break;

        default:
          break;
      }
    }
  };

  useHotkeys(exportSVG[0].hotKey, () => handleExport("SVG"));
  useHotkeys(exportPNG[0].hotKey, () => handleExport("PNG"));
  useHotkeys(exportJPG[0].hotKey, () => handleExport("JPG"));
  useHotkeys(copySnippet[0].hotKey, () => copyCodeToClipboard());
  useHotkeys(copyImg[0].hotKey, () => copyImageToClipboard());

  // If in animation mode, show simple export video button
  if (animationMode) {
    return (
      <Button
        size="sm"
        onClick={animationMode.onExport}
        disabled={!animationMode.canExport || animationMode.isExporting}
      >
        {animationMode.isExporting ? (
          <>
            <i className="ri-loader-4-line animate-spin mr-2" />
            Exporting...
          </>
        ) : (
          <>
            <i className="ri-video-download-line mr-2" />
            Export Video
          </>
        )}
      </Button>
    );
  }

  // Regular image export dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <i className="ri-folder-image-line text-lg mr-3"></i> Export{" "}
          <i className="ri-arrow-drop-down-fill text-xl ml-1 !-mr-2"></i>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="gap-8"
          onClick={copyCodeToClipboard}
          disabled={!code}
        >
          <div className="flex items-center gap-2">
            <i className="ri-code-box-line text-lg" />
            Copy Code
          </div>
          <DropdownMenuShortcut>
            {copySnippet[0]?.keyboard}
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-8" onClick={copyImageToClipboard}>
          <div className="flex items-center gap-2">
            <i className="ri-clipboard-line text-lg" />
            Copy Image
          </div>
          <DropdownMenuShortcut>{copyImg[0]?.keyboard}</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="gap-8" onClick={() => handleExport("SVG")}>
          <div className="flex items-center gap-2">
            <i className="ri-circle-fill text-[#6A67C1]" />
            Save as SVG
          </div>
          <DropdownMenuShortcut>{exportSVG[0]?.keyboard}</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-8" onClick={() => handleExport("PNG")}>
          <div className="flex items-center gap-2">
            <i className="ri-circle-fill  text-[#D16575]" />
            Save as PNG
          </div>
          <DropdownMenuShortcut>{exportPNG[0]?.keyboard}</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-8" onClick={() => handleExport("JPG")}>
          <div className="flex items-center gap-2">
            <i className="ri-circle-fill  text-[#E0DB32]" />
            Save as JPG
          </div>
          <DropdownMenuShortcut>{exportJPG[0]?.keyboard}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
