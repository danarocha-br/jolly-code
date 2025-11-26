"use client";
import { useHotkeys } from "react-hotkeys-hook";

import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/app/store";
import { hotKeyList } from "@/lib/hot-key-list";

const changePadding = hotKeyList.filter(
  (item) => item.label === "Change padding"
);
export const PaddingSelector = () => {
  const padding = useEditorStore((state) => state.padding);

  function handleChangePadding(value: number) {
    useEditorStore.setState({ padding: value });
  }

  const hotKey = changePadding.length > 0 ? changePadding[0].hotKey : null;

  useHotkeys(hotKey || "", () => {
    if (hotKey) {
      handleChangePadding(padding + 4);
    }
  });

  return (
    <Slider
      label={padding + " px"}
      value={[padding]}
      onValueChange={([padding]: number[]) => handleChangePadding(padding)}
      max={92}
      min={36}
      step={4}
      iconSlot={<i className=" ri-artboard-2-line scale-105" />}
      className="hidden lg:flex"
    />
  );
};
