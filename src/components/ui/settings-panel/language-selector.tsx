import React from "react";
import { CaretSortIcon } from "@radix-ui/react-icons";

import { useEditorStore } from "@/app/store";
import { LanguageProps, languages } from "@/lib/language-options";
import { cn } from "@/lib/utils";
import { languagesLogos } from "@/lib/language-logos";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Button } from "../button";
import { Command, CommandGroup, CommandInput, CommandItem } from "../command";
import { Tooltip } from "../tooltip";
import { CommandEmpty } from "cmdk";
import { SettingsPanelItem } from "./item";

export const LanguageSelector = () => {
  const language = useEditorStore((state) => state.language);
  const autoDetectLanguage = useEditorStore(
    (state) => state.autoDetectLanguage
  );
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(language);

  function handleChange(language: string) {
    if (language === "auto-detect") {
      useEditorStore.setState({
        autoDetectLanguage: true,
        language: "plaintext",
      });
    } else {
      useEditorStore.setState({ autoDetectLanguage: false, language });
      setValue(language);
    }
  }

  const languagesArray = Object.entries(languages).map(([key, label]) => ({
    label: label,
    value: key,
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <SettingsPanelItem value={language}>
          <Tooltip content="Choose a language">
            <Button
              asChild
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              <div>
                <span className="truncate">
                  <i className="ri-code-box-fill text-xl" />
                </span>
                <CaretSortIcon className="ml-2 h-4 w-4 -mr-3 shrink-0 opacity-50" />
              </div>
            </Button>
          </Tooltip>
        </SettingsPanelItem>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search language..." />
          <CommandEmpty className="px-4">No language found.</CommandEmpty>
          <CommandGroup className="max-h-[380px] overflow-scroll scrollbar-thin scrollbar-thumb-accent scrollbar-corner-accent/40  scrollbar-track-accent/40">
            <CommandItem
              onSelect={() => {
                handleChange("auto-detect");
                setOpen(false);
              }}
            >
              <span className="mr-auto">
                <i className="ri-magic-fill text-amber-500 mr-2" /> Auto Detect
              </span>

              <i
                className={cn(
                  "ri-checkbox-circle-fill mr-2 h-4 w-4",
                  autoDetectLanguage ? "opacity-100" : "opacity-0"
                )}
              />
            </CommandItem>
            {languagesArray.map((language) => (
              <CommandItem
                key={language.value}
                onSelect={() => {
                  handleChange(language.value);
                  setOpen(false);
                }}
              >
                <span className="mr-3">
                  {languagesLogos[language.value as LanguageProps]}
                </span>
                <span className="mr-auto">{language.label}</span>

                <i
                  className={cn(
                    "ri-checkbox-circle-fill mr-2 h-4 w-4",
                    value === language.value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
