import React from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/app/store";
import { useMediaQuery } from "@/lib/utils/media-query";
import { hotKeyList } from "@/lib/hot-key-list";

const changeFontSize = hotKeyList.filter(
  (item) => item.label === "Change font size"
);
export const FontSizeSelector = () => {
  const fontSize = useEditorStore((state) => state.fontSize);
  const isMobile = useMediaQuery("(max-width: 768px)");

  function handleFontSizeChange(value: number) {
    useEditorStore.setState({ fontSize: value });
  }

  const hotKey = changeFontSize.length > 0 ? changeFontSize[0].hotKey : null;

  useHotkeys(hotKey || "", () => {
    if (hotKey) {
      handleFontSizeChange(fontSize + 1);
    }
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
