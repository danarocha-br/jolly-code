import { useCallback, useMemo } from "react";
import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useMutation } from "react-query";

import { Tooltip } from "../tooltip";
import { Button } from "../button";
import { hotKeyList } from "@/lib/hot-key-list";
import { useUserSettingsStore } from "@/app/store";
import { getDomain } from "@/lib/utils/get-domain";

export const CopyURLToClipboard = () => {
  const user = useUserSettingsStore((state) => state.user);
  const [generatedLongUrl, setGeneratedLongUrl] = useState<string>("");

  const postLinkDataToDatabase = useMutation(async () => {
    try {
      const response = await fetch("/api/shorten-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          snippet_id: "",
          url: generatedLongUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const shortUrl = data.short_url;
        navigator.clipboard.writeText(`${getDomain()}/${shortUrl}`);
      } else {
        toast.error("Failed to fetch data.");
      }

      return { response };
    } catch (error) {
      console.log(error);
      toast.error("An error occurred while copying the link.");
    }
  });

  const handleCopyLinkToClipboard = useCallback(async () => {
    const state = useUserSettingsStore.getState();
    const stringifiedState = Object.fromEntries(
      Object.entries(state).map(([key, value]) => [key, String(value)])
    );

    const queryParams = new URLSearchParams({
      ...stringifiedState,
      code: btoa(state.code),
    }).toString();

    const url = `${location.href}?${queryParams}&shared=true`;

    await setGeneratedLongUrl(url);

    await postLinkDataToDatabase.mutate();

    toast.success("Link copied to clipboard.");
  }, [setGeneratedLongUrl, postLinkDataToDatabase]);

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
        onClick={handleCopyLinkToClipboard}
        className="whitespace-nowrap"
      >
        <i className="ri-link text-lg mr-2"></i>Copy Link
      </Button>
    </Tooltip>
  );
};
