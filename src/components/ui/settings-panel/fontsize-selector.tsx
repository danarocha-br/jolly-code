import React from "react";

import { useUserSettingsStore } from "@/app/store";
import { useMediaQuery } from '@/lib/utils';
import { Slider } from "../slider";

export const FontSizeSelector = () => {
  const fontSize = useUserSettingsStore((state) => state.fontSize);
 const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Slider
      label={fontSize + " px"}
      value={[fontSize]}
      onValueChange={([fontSize]: number[]) =>
        useUserSettingsStore.setState({ fontSize })
      }
      max={isMobile ? 16 : 24}
      min={12}
      step={1}
      iconSlot={<i className=" ri-font-size-2 scale-105" />}
    />

    // <Popover>
    //   <PopoverTrigger>
    //     <SettingsPanelItem value={fontSize.toString() + ' px'}>
    //     <Button variant="ghost" className="!focus:outline-none focus:bg-muted">
    //       <i className="ri-font-size-2 text-xl scale-105 mr-1" />
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
    //       <label
    //         htmlFor="font-size"
    //         className="text-sm font-thin text-muted-foreground"
    //       >
    //         Font Size
    //       </label>
    //       {/* <Badge variant="secondary">{fontSize}px</Badge> */}
    //       <Input
    //         min={6}
    //         value={fontSize}
    //         onChange={(e) =>
    //           useUserSettingsStore.setState({
    //             fontSize: Number(e.target.value),
    //           })
    //         }
    //         className='!text-sm !p-1 w-12 h-5 rounded-[4px] text-center'
    //       />
    //     </div>
    //     <Slider
    //       className="w-44"
    //       value={[fontSize]}
    //       onValueChange={([fontSize]: number[]) =>
    //         useUserSettingsStore.setState({ fontSize })
    //       }
    //       max={24}
    //       min={12}
    //       step={1}
    //     />
    //   </PopoverContent>
    // </Popover>
  );
};
