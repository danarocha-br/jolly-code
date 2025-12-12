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
    <SettingsPanelItem
      value={showBackground ? "On" : "Off"}
      onClick={handleToggleBackground}
      role="switch"
      aria-checked={showBackground}
    >
      <Tooltip content="Show/hide background">
        <Button
          variant="ghost"
          className="!focus:outline-none focus:bg-muted"
          onClick={(e) => {
            // Prevent event bubbling since the card handles the click
            e.stopPropagation();
            handleToggleBackground();
          }}
          aria-hidden="true" // Hide from screen readers since parent handles interaction
          tabIndex={-1} // Remove from tab order since parent is focusable
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
