import React from "react";

import { Slider } from "../slider";
import { useUserSettingsStore } from "@/app/store";

export const PaddingSelector = () => {
  const padding = useUserSettingsStore((state) => state.padding);

  return (
    <Slider
      label={padding + " px"}
      value={[padding]}
      onValueChange={([padding]: number[]) =>
        useUserSettingsStore.setState({ padding })
      }
      max={92}
      min={28}
      step={4}
      iconSlot={<i className=" ri-artboard-2-line scale-105" />}
      className="hidden lg:flex"
    />

    // <Popover>
    //   <PopoverTrigger>
    //     <SettingsPanelItem value={padding.toString() + ' px'}>
    //     <Button variant="ghost" className="!focus:outline-none focus:bg-muted">
    //       <i className="ri-artboard-2-line text-lg mr-1" />

    //       <CaretSortIcon className="h-4 w-4 opacity-50 -mr-2" />
    //       </Button>
    //     </SettingsPanelItem>
    //   </PopoverTrigger>
    //   <PopoverContent
    //     align="start"
    //     sideOffset={14}
    //     className="w-52 flex flex-col gap-6"
    //   >
    //     <div className="flex justify-between w-full">
    //       <label htmlFor="padding" className="text-sm font-thin text-muted-foreground">
    //         Padding
    //       </label>
    //       <Badge variant='secondary' >{padding}px</Badge>
    //       {/* <span className="text-sm text-foreground">{padding}px</span> */}
    //     </div>
    //     <Slider
    //       className="w-44"
    //       value={[padding]}
    //       onValueChange={([padding]: number[]) =>
    //         useUserSettingsStore.setState({ padding })
    //       }
    //       max={92}
    //       min={28}
    //       step={4}
    //     />
    //   </PopoverContent>
    // </Popover>
  );
};
