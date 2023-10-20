import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";

import { themes } from "@/lib/themes-options";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/app/store";
import { SettingsPanelItem } from "./item";
import { Tooltip } from '../tooltip';

export const ThemeSelector = () => {
  const backgroundTheme = useEditorStore(
    (state) => state.backgroundTheme
  );

  return (
    <SettingsPanelItem value={backgroundTheme}>
      <Select
        value={backgroundTheme}
        onValueChange={(theme) => {
          useEditorStore.setState({
            backgroundTheme: theme as typeof backgroundTheme,
          });
        }}
      >
        <Tooltip content="Change theme">
          <SelectTrigger className="w-16">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
        </Tooltip>

        <SelectContent>
          {Object.entries(themes).map(([name, theme]) => (
            <SelectItem key={name} value={name}>
              <div className="flex gap-2 ml-2 items-center">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full outline outline-foreground/20 outline-offset-2",
                    theme.background
                  )}
                />
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsPanelItem>
  );
};
