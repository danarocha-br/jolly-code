"use client";
import React, { useState } from "react";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { CommandEmpty } from "cmdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/shallow";

import { useEditorStore, useUserStore } from "@/app/store";
import { LanguageProps, languages } from "@/lib/language-options";
import { cn } from "@/lib/utils";
import { languagesLogos } from "@/lib/language-logos";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui//popover";
import { Button } from "@/components/ui//button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command/index";
import { Tooltip } from "@/components/ui//tooltip";
import { SettingsPanelItem } from "./ui/item";
import { updateSnippet } from "@/features/snippets/queries";
import { Snippet } from "@/lib/services/database/types";
import { Collection } from "@/features/snippets/dtos";

const languagesArray = Object.entries(languages).map(([key, label]) => ({
  label: label,
  value: key,
}));

/**
 * Renders a language selector component.
 */
export const LanguageSelector = () => {
  const currentState = useEditorStore((state) => state.currentEditorState);
  const user = useUserStore((state) => state.user);

  const queryClient = useQueryClient();
  const queryKey = ["collections"];

  const { language, autoDetectLanguage, isSnippetSaved } = useEditorStore(
    useShallow((state) => {
      const editor = state.editors.find(
        (editor) => editor.id === currentState?.id
      );
      return editor
        ? {
          language: editor.language,
          autoDetectLanguage: editor.autoDetectLanguage,
          isSnippetSaved: editor.isSnippetSaved,
        }
        : {
          language: "plain-text",
          autoDetectLanguage: true,
          isSnippetSaved: false,
        };
    })
  );

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(language);

  const { mutate: handleUpdateSnippet } = useMutation({
    mutationFn: updateSnippet,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<Collection[]>(queryKey);

      return { previousState };
    },
    onError: (err, variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  /**
   * Handles the change of the language.
   *
   * @param {string} language - The new language to be set.
   */
  function handleChange(language: string) {
    if (currentState) {
      if (language === "auto-detect") {
        useEditorStore.setState({
          editors: useEditorStore.getState().editors.map((editor) => {
            if (editor.id === currentState.id) {
              return {
                ...editor,
                autoDetectLanguage: true,
                language: "plaintext",
              };
            }
            return editor;
          }),
        });
      } else {
        useEditorStore.setState({
          editors: useEditorStore.getState().editors.map((editor) => {
            if (editor.id === currentState.id) {
              return {
                ...editor,
                autoDetectLanguage: false,
                language,
              };
            }
            return editor;
          }),
        });
        setValue(language);

        if (user && isSnippetSaved) {
          handleUpdateSnippet({
            user_id: user?.id,
            id: currentState.id,
            language,
          });
        }
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <SettingsPanelItem value={language || "plaintext"}>
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
