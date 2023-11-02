import { useCallback, useEffect, useMemo } from "react";
import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { Tooltip } from "../tooltip";
import { Button } from "../button";
import { hotKeyList } from "@/lib/hot-key-list";
import { useUserStore, useEditorStore } from "@/app/store";

export const CopyURLToClipboard = () => {
  const user = useUserStore((state) => state.user);
  const currentState = useEditorStore((state) => state.currentEditorState);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const { code } = useEditorStore((state) => {
    const editor = state.editors.find(
      (editor) => editor.id === currentState?.id
    );
    return editor
      ? {
          code: editor.code,
        }
      : {
          code: "",
        };
  });

  useEffect(() => {
    const urlObj = new URL(window.location.href);

    setCurrentUrl(urlObj.origin);
  }, []);

  const postLinkDataToDatabase = useMutation(async (url: string) => {
    try {
      const response = await fetch("/api/shorten-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          snippet_id: "",
          url,
        }),
      });

      const data = await response.json();

      const shortUrl = data.short_url;
      await navigator.clipboard.writeText(`${currentUrl}/${shortUrl}`);

      return { response };
    } catch (error) {
      toast.error("Oh no, something went wrong. Please try again.");
    }
  });

  const handleCopyLinkToClipboard = useCallback(async () => {
    const state = useEditorStore.getState();
    const stringifiedState = Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, String(value)])
    );

    const queryParams = new URLSearchParams({
      ...stringifiedState,
      code: btoa(code),
    }).toString();

    const url = `${currentUrl}?${queryParams}&shared=true`;

    await postLinkDataToDatabase.mutate(url);

    toast.success("Link copied to clipboard.");
  }, [postLinkDataToDatabase, currentUrl, code]);

  const copyLink = useMemo(
    () => hotKeyList.filter((item) => item.label === "Copy link"),
    []
  );

  useHotkeys(copyLink[0]?.hotKey, () => {
    if (copyLink[0]) {
      handleCopyLinkToClipboard();
    }
  });

  if (!copyLink[0]) {
    return null;
  }

  return (
    <Tooltip content={copyLink[0].keyboard}>
      <Button
        size="sm"
        onClick={() => handleCopyLinkToClipboard()}
        className="whitespace-nowrap"
      >
        <i className="ri-link text-lg mr-2"></i>Copy Link
      </Button>
    </Tooltip>
  );
};
