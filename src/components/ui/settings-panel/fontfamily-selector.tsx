import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../select";
import { useEditorStore } from "@/app/store";
import { fonts, FontsProps } from "@/lib/fonts-options";
import { SettingsPanelItem } from './item';
import { Tooltip } from '../tooltip';

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
