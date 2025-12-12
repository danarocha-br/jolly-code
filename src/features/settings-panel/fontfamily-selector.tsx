"use client";
import React, { useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select/index";
import { Tooltip } from '@/components/ui/tooltip';
import { useEditorStore } from "@/app/store";
import { fonts, FontsProps } from "@/lib/fonts-options";
import { SettingsPanelItem } from './ui/item';

export const FontFamilySelector = () => {
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const selectRef = useRef<HTMLButtonElement>(null);

  const handleCardClick = () => {
    // Programmatically click the select trigger to open it
    selectRef.current?.click();
  };

  return (
    <SettingsPanelItem
      value={fontFamily}
      onClick={handleCardClick}
      role="combobox"
      aria-expanded={false}
      aria-haspopup="listbox"
    >
      <Select
        value={fontFamily}
        onValueChange={(fontFamily: FontsProps) =>
          useEditorStore.setState({ fontFamily })
        }
      >
        <Tooltip content="Change font">
          <SelectTrigger
            ref={selectRef}
            className=""
            aria-hidden="true" // Hide from screen readers since parent handles interaction
            tabIndex={-1} // Remove from tab order since parent is focusable
          >
            <i className="ri-font-family text-lg ml-2" />
          </SelectTrigger>
        </Tooltip>

        <SelectContent>
          {Object.entries(fonts).map(([id, font]) => (
            <SelectItem key={id} value={id}>
              <span className="capitalize truncate">{font.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsPanelItem>
  );
};
