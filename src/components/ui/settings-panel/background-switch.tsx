import React from "react";

import { useUserSettingsStore } from "@/app/store";
import { Button } from '../button';
import { SettingsPanelItem } from './item';
import { Tooltip } from '../tooltip';

export const BackgroundSwitch = () => {
  const showBackground = useUserSettingsStore((state) => state.showBackground);

  return (
    <SettingsPanelItem value={showBackground ? "On" : "Off"}>
      <Tooltip content="Show/hide background">
        <Button
          variant="ghost"
          className="!focus:outline-none focus:bg-muted"
          onClick={() => {
            useUserSettingsStore.setState({ showBackground: !showBackground });
          }}
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
