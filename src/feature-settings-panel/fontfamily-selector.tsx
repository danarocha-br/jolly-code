import React from "react";

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

  return (
    <SettingsPanelItem value={fontFamily}>
      <Select
        value={fontFamily}
        onValueChange={(fontFamily: FontsProps) =>
          useEditorStore.setState({ fontFamily })
        }
      >
        <Tooltip content="Change font">
          <SelectTrigger className="">
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
