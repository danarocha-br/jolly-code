import React, { useEffect } from "react";
import { toBlob, toJpeg, toPng, toSvg } from "html-to-image";

import { Button } from "../button";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { toast } from "sonner";
import { useUserSettingsStore } from "@/app/store";

type ImageFormat = "SVG" | "PNG" | "JPG";

export const ExportMenu = () => {
  const title = useUserSettingsStore((state) => state.title);
  const code = useUserSettingsStore((state) => state.code);


  /**
   * Copies the image from a DOM element to the clipboard.
   *
   * @param editorRef - The reference to the DOM element containing the image.
   * @returns A promise that resolves when the image is successfully copied to the clipboard.
   */
  async function copyImageToClipboard() {

    try {
      toast.loading("Copying...");
      const imageBlob = await toBlob(document.getElementById("editor")!, {
        pixelRatio: 2,
      });

      if (!imageBlob) {
        toast.error("Something went wrong!");
        return;
      }

      const image = new ClipboardItem({ "image/png": imageBlob });
      await navigator.clipboard.write([image]);

      toast.success("Image copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy image to clipboard", error);
      toast.error("Something went wrong!");
    }
  }

  async function copyCodeToClipboard() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard!");
    } catch (err) {
      toast.error("Something went wrong!");
    }
  }

  async function handleSaveImage(name: string, format: ImageFormat) {
    let imageURL, fileName;

    switch (format) {
      case "PNG":
        imageURL = await toPng(document.getElementById("editor")!, {
          pixelRatio: 2,
        });
        fileName = `${name}.png`;
        break;

      case "JPG":
        imageURL = await toJpeg(document.getElementById("editor")!, {
          pixelRatio: 2,
        });
        fileName = `${name}.jpg`;
        break;

      case "SVG":
        imageURL = await toSvg(document.getElementById("editor")!, {
          pixelRatio: 2,
        });
        fileName = `${name}.svg`;
        break;

      default:
        // If the provided format is not supported, return without doing anything
        return;
    }

    const link = document.createElement("a");
    // Set the link's href to the image URL
    link.href = imageURL;
    // Set the link's download attribute to the file name
    link.download = fileName;
    // Programmatically trigger a click on the link element to initiate the file download
    link.click();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <i className="ri-folder-image-line text-lg mr-3"></i> Export{" "}
          <i className="ri-arrow-drop-down-fill text-xl ml-1 !-mr-2"></i>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuItem className="gap-2" onClick={copyCodeToClipboard}>
          <i className="ri-code-box-line text-lg" />
          Copy Code
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={copyImageToClipboard}>
          <i className="ri-clipboard-line text-lg" />
          Copy Image
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2"
          onClick={() => {
            toast.promise(handleSaveImage(title, "SVG"), {
              loading: "Exporting SVG image...",
              success: "Successfully exported!",
              error: "Sorry. Something went wrong.",
            });
          }}
        >
          <i className="ri-circle-fill text-[#6A67C1]" />
          Save as SVG
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onClick={() => {
            toast.promise(handleSaveImage(title, "PNG"), {
              loading: "Exporting PNG image...",
              success: "Successfully exported!",
              error: "Sorry. Something went wrong.",
            });
          }}
        >
          <i className="ri-circle-fill  text-[#D16575]" />
          Save as PNG
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2"
          onClick={() => {
            toast.promise(handleSaveImage(title, "JPG"), {
              loading: "Exporting JPG image...",
              success: "Successfully exported!",
              error: "Sorry. Something went wrong.",
            });
          }}
        >
          <i className="ri-circle-fill  text-[#E0DB32]" />
          Save as JPG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
