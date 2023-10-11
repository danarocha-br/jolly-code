import { useCallback, useMemo } from "react";
import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useMutation } from "react-query";

import { Tooltip } from "../tooltip";
import { Button } from "../button";
import { hotKeyList } from "@/lib/hot-key-list";
import { useUserSettingsStore } from "@/app/store";

export const CopyURLToClipboard = () => {
  const user = useUserSettingsStore((state) => state.user);
  const [generatedLongUrl, setGeneratedLongUrl] = useState("");

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
      const { data: links } = await response.json();
      const shortUrl = links.data[0].short_url;
      navigator.clipboard.writeText(shortUrl);
      console.log(shortUrl);

      return { response };
    } catch (error) {
      console.log(error);
    }
  });

  const handleCopyLinkToClipboard = useCallback(async () => {
    const state = useUserSettingsStore.getState();
    const queryParams = new URLSearchParams(
      //@ts-ignore
      { ...state, code: btoa(state.code) }
    ).toString();

    const url = `${location.href}?${queryParams}&shared=true`;

    setGeneratedLongUrl(url);

    //TODO: if it's already a short link, don't post to db, but just return the original url

    postLinkDataToDatabase.mutate();

    toast.success("Link copied to clipboard");
  }, [setGeneratedLongUrl, postLinkDataToDatabase]);

  const copyLink = useMemo(
    () => hotKeyList.filter((item) => item.label === "Copy link"),
    []
  );

  useHotkeys(copyLink[0].hotKey, handleCopyLinkToClipboard);

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
