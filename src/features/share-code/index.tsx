"use client";
import { useState, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useShallow } from "zustand/shallow";

import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { hotKeyList } from "@/lib/hot-key-list";
import { useUserStore, useEditorStore } from "@/app/store";
import { analytics } from "@/lib/services/tracking";
import { LoginDialog } from "@/features/login";

export const CopyURLToClipboard = () => {
  const user = useUserStore((state) => state.user);
  const [showLogin, setShowLogin] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const currentEditorState = useEditorStore(
    (state) => state.currentEditorState
  );
  const { code } = useEditorStore(
    useShallow((state) => {
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
    })
  );

  useEffect(() => {
    const urlObj = new URL(window.location.href);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUrl(urlObj.origin);
  }, []);

  const postLinkDataToDatabase = useMutation({
    mutationFn: async (url: string) => {
      if (!user) {
        throw Object.assign(new Error("AUTH_REQUIRED"), { code: "AUTH_REQUIRED" });
      }

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
    onError: (error: any) => {
      if (error?.code === "AUTH_REQUIRED") {
        setShowLogin(true);
        return;
      }
      toast.error("Oh no, something went wrong. Please try again.");
    },
  });

  const handleCopyLinkToClipboard = async () => {
    if (!user) {
      setShowLogin(true);
      return;
    }

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
  };

  const copyLink = hotKeyList.filter((item) => item.label === "Copy link");

  useHotkeys(copyLink[0]?.hotKey, () => {
    if (copyLink[0]) {
      handleCopyLinkToClipboard();
    }
  });

  if (!copyLink[0]) {
    return null;
  }

  return (
    <>
      <LoginDialog open={showLogin} onOpenChange={setShowLogin} hideTrigger />
      <Tooltip content={copyLink[0].keyboard}>
        <Button
          size="sm"
          onClick={() => handleCopyLinkToClipboard()}
          className="whitespace-nowrap"
        >
          <i className="ri-link text-lg mr-2"></i>Copy Link
        </Button>
      </Tooltip>
    </>
  );
};
