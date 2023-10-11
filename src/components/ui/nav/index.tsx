import React from "react";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "../button";
import { ExportMenu } from "./export-menu";
import { hotKeyList } from "@/lib/hot-key-list";
import { useUserSettingsStore } from "@/app/store";
import { CopyURLToClipboard } from "./copy-url-to-clipboard";
import UsersPresence from "./users-presence";

const toggleTheme = hotKeyList.filter((item) => item.label === "Toggle theme");

export const Nav = () => {
  const { theme, setTheme } = useTheme();
  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );

  /**
   * Handles the toggle theme functionality.
   *
   * @return {void} No return value.
   */
  function handleToggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

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
        {isPresentational && <UsersPresence />}

        <ExportMenu />

        <CopyURLToClipboard />
      </div>
    </nav>
  );
};
