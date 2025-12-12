"use client";
import { useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select/index";
import { Tooltip } from '@/components/ui/tooltip';
import { themes } from "@/lib/themes-options";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/app/store";
import { SettingsPanelItem } from "./ui/item";
import { analytics } from "@/lib/services/tracking";

export const ThemeSelector = () => {
  const backgroundTheme = useEditorStore(
    (state) => state.backgroundTheme
  );
  const selectRef = useRef<HTMLButtonElement>(null);

  const handleCardClick = () => {
    // Programmatically click the select trigger to open it
    selectRef.current?.click();
  };

  return (
    <SettingsPanelItem
      value={backgroundTheme}
      onClick={handleCardClick}
      role="combobox"
      aria-expanded={false}
      aria-haspopup="listbox"
    >
      <Select
        value={backgroundTheme}
        onValueChange={(theme) => {
          useEditorStore.setState({
            backgroundTheme: theme as typeof backgroundTheme,
          });
          analytics.track("change_theme", { theme_name: theme });
        }}
      >
        <Tooltip content="Change theme">
          <SelectTrigger
            ref={selectRef}
            className="w-16"
            aria-hidden="true" // Hide from screen readers since parent handles interaction
            tabIndex={-1} // Remove from tab order since parent is focusable
          >
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
