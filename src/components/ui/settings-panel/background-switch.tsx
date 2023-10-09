import React from "react";

import { useUserSettingsStore } from "@/app/store";
import { Button } from "../button";
import { SettingsPanelItem } from "./item";
import { Tooltip } from "../tooltip";
import { hotKeyList } from "@/lib/hot-key-list";
import { useHotkeys } from "react-hotkeys-hook";

const toggleBackground = hotKeyList.filter(
  (item) => item.label === "Toggle background"
);

export const BackgroundSwitch = () => {
  const showBackground = useUserSettingsStore((state) => state.showBackground);

  function handleToggleBackground() {
    useUserSettingsStore.setState({ showBackground: !showBackground });
  }

  useHotkeys(toggleBackground[0].hotKey, () => {
    handleToggleBackground();
  });

  return (
    <SettingsPanelItem value={showBackground ? "On" : "Off"}>
      <Tooltip content="Show/hide background">
        <Button
          variant="ghost"
          className="!focus:outline-none focus:bg-muted"
          onClick={() => handleToggleBackground()}
        >
          {showBackground ? (
            <i className="ri-drop-fill text-lg" />
          ) : (
            <i className="ri-blur-off-fill text-lg" />
          )}
        </Button>
      </Tooltip>
    </SettingsPanelItem>
  );
};
