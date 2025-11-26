import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hotKeyList } from "@/lib/hot-key-list";
import * as S from "./styles";

const shortcuts = hotKeyList.filter((item) => item.label === "Shortcuts");

export const HotKeysPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleOpenPopover = () => setIsPopoverOpen(!isPopoverOpen);

  useHotkeys(shortcuts[0].hotKey, () => handleOpenPopover());

  if (!hotKeyList) {
    return null;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={() => handleOpenPopover()}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <Tooltip content="Shortcuts" align="end" side="right" sideOffset={10}>
            <i className="ri-keyboard-line text-lg" />
          </Tooltip>
        </Button>
      </PopoverTrigger>

      <PopoverContent side="right" sideOffset={12}>
        <div className="flex flex-col space-y-2">
          {hotKeyList.map((item, i) => (
            <div key={i} className={S.container()}>
              <span className={S.label()}>{item.label}</span>
              <Badge
                variant="secondary"
                className="capitalize bg-zinc-700 dark:bg-zinc-900  text-white"
              >
                {item.keyboard}
              </Badge>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
