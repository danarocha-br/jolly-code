import React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { useUserSettingsStore } from "@/app/store";
import { Button } from "../button";
import { ExportMenu } from "./export-menu";
import { useHotkeys } from "react-hotkeys-hook";
import { hotKeyList } from "@/lib/hot-key-list";
import { Tooltip } from "../tooltip";
import { Avatar } from "../avatar";
import { useOthers, useSelf } from "../../../../liveblocks.config";

const copyLink = hotKeyList.filter((item) => item.label === "Copy link");
const toggleTheme = hotKeyList.filter((item) => item.label === "Toggle theme");

export const Nav = () => {
  const { theme, setTheme } = useTheme();
  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );

  const users = useOthers();
  const userCount = users.length;
  const currentUser = useSelf();
  const hasMoreUsers = users.length > 3;

  /**
   * Handles copying the link to the clipboard.
   *
   * @return {void}
   */
  function handleCopyLinkToClipboard() {
    // Get the user settings state using the useUserSettingsStore hook
    const state = useUserSettingsStore.getState();

    // Convert the state object to query parameters and encode the 'code' property using base64
    const queryParams = new URLSearchParams(
      //@ts-ignore
      { ...state, code: btoa(state.code) }
    ).toString();

    // Copy the generated link to the clipboard by writing it as text
    navigator.clipboard.writeText(
      `${location.href}?${queryParams}&shared=true`
    );

    toast.success("Link copied to clipboard");
  }

  function handleToggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  useHotkeys(copyLink[0].hotKey, () => handleCopyLinkToClipboard());
  useHotkeys(toggleTheme[0].hotKey, () => handleToggleTheme());

  return (
    <nav className="fixed top-0 flex items-center justify-between gap-2 px-3 lg:px-4 py-3 z-50 w-full">
      <Button
        size="icon"
        variant="secondary"
        className="lg:hidden mr-auto"
        onClick={() => handleToggleTheme()}
      >
        {theme === "dark" ? (
          <i className="ri-moon-fill text-lg" />
        ) : (
          <i className="ri-sun-fill text-lg" />
        )}
      </Button>

      <div className="flex items-center justify-end py-2 lg:pt-3 lg:pr-3 w-full gap-2">
        {isPresentational && (
          <div className="flex pr-3">
            {users.slice(0, 3).map(({ connectionId, info }: any) => {
              return (
                <Avatar
                  key={connectionId}
                  imageSrc={info.avatar_url}
                  username={info.name}
                />
              );
            })}

            {hasMoreUsers && <div className="">+{users.length - 3}</div>}

            {currentUser && (
              <div className="relative">
                <Avatar
                  imageSrc={
                    (currentUser.info as { avatar_url: string }).avatar_url
                  }
                  username="You"
                />
              </div>
            )}
          </div>
        )}

        <ExportMenu />

        <Tooltip content={copyLink[0].keyboard}>
          <Button
            size="sm"
            onClick={handleCopyLinkToClipboard}
            className="whitespace-nowrap"
          >
            <i className="ri-link text-lg mr-2"></i>Copy Link
          </Button>
        </Tooltip>
      </div>
    </nav>
  );
};
