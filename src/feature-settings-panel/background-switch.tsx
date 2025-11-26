"use client";
import { useHotkeys } from "react-hotkeys-hook";

import { useEditorStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { hotKeyList } from "@/lib/hot-key-list";
import { SettingsPanelItem } from "./ui/item";

const toggleBackground = hotKeyList.filter(
  (item) => item.label === "Toggle background"
);

export const BackgroundSwitch = () => {
  const showBackground = useEditorStore((state) => state.showBackground);

  function handleToggleBackground() {
    useEditorStore.setState({ showBackground: !showBackground });
  }

  const hotKey =
    toggleBackground.length > 0 ? toggleBackground[0].hotKey : null;

  useHotkeys(hotKey || "", hotKey ? handleToggleBackground : () => { });

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
