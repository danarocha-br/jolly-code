import React from "react";

import { useUserSettingsStore } from "@/app/store";
import { useMediaQuery } from "@/lib/utils";
import { Slider } from "../slider";
import { hotKeyList } from "@/lib/hot-key-list";
import { useHotkeys } from "react-hotkeys-hook";

const changeFontSize = hotKeyList.filter(
  (item) => item.label === "Change font size"
);
export const FontSizeSelector = () => {
  const fontSize = useUserSettingsStore((state) => state.fontSize);
  const isMobile = useMediaQuery("(max-width: 768px)");

  function handleFontSizeChange(value: number) {
    useUserSettingsStore.setState({ fontSize: value });
  }

  useHotkeys(changeFontSize[0].hotKey, () => {
    handleFontSizeChange(fontSize + 1);
  });

  return (
    <Slider
      label={fontSize + " px"}
      value={[fontSize]}
      onValueChange={([fontSize]: number[]) => handleFontSizeChange(fontSize)}
      max={isMobile ? 16 : 24}
      min={12}
      step={1}
      iconSlot={<i className=" ri-font-size-2 scale-105" />}
    />
  );
};
