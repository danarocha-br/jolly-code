import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { hotKeyList } from "@/lib/hot-key-list";
import { useUserStore, useEditorStore } from "@/app/store";
import { analytics } from "@/lib/services/analytics";

export const CopyURLToClipboard = () => {
  const user = useUserStore((state) => state.user);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const currentEditorState = useEditorStore(
    (state) => state.currentEditorState
  );
  const { code } = useEditorStore((state) => {
    const editor = state.editors.find(
      (editor) => editor.id === currentEditorState?.id
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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUrl(urlObj.origin);
  }, []);

  const postLinkDataToDatabase = useMutation({
    mutationFn: async (url: string) => {
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

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      return data.short_url;
    },
    onSuccess: async (shortUrl) => {
      await navigator.clipboard.writeText(`${currentUrl}/${shortUrl}`);
    },
    onError: (error) => {
      toast.error("Oh no, something went wrong. Please try again.");
    },
  });

  const handleCopyLinkToClipboard = useCallback(async () => {
    const stringifiedState = Object.fromEntries(
      Object.entries(currentEditorState || {}).map(([key, value]) => [
        key,
        String(value),
      ])
    );

    const queryParams = new URLSearchParams({
      ...stringifiedState,
      code: btoa(code),
    }).toString();

    const url = `${currentUrl}?${queryParams}&shared=true`;

    postLinkDataToDatabase.mutate(url);

    analytics.track("copy_link", {
      snippet_id: currentEditorState?.id,
    });

    toast.success("Link copied to clipboard.");
  }, [postLinkDataToDatabase, currentUrl, code, currentEditorState]);

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
