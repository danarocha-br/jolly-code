import React, { useState } from "react";

import { Button } from "../../ui/button";
import {
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "../../ui/dropdown-menu";
import { useUserSettingsStore } from "@/app/store";
import { Tooltip } from "../../ui/tooltip";
import { hotKeyList } from "@/lib/hot-key-list";
import { useHotkeys } from "react-hotkeys-hook";

type EditorViewPreference = "default" | "minimal";

const toggleEditorPreferences = hotKeyList.filter(
  (item) => item.label === "Toggle editor preferences"
);
const toggleEditorLineNumbers = hotKeyList.filter(
  (item) => item.label === "Toggle editor line numbers"
);

export const EditorOptionsMenu = () => {
  const editor = useUserSettingsStore((state) => state.editor);

  const [editorPreference, setEditorPreference] =
    useState<EditorViewPreference>(editor);

  const editorShowLineNumbers = useUserSettingsStore(
    (state) => state.editorShowLineNumbers
  );

  function changeEditorViewPreference(value: EditorViewPreference) {
    const userSettings = useUserSettingsStore.getState();
    const updatedSettings = { ...userSettings, editor: value };
    useUserSettingsStore.setState(updatedSettings);
  }

  function handleEditorViewPreferences(value: EditorViewPreference) {
    setEditorPreference(value);
    changeEditorViewPreference(value);
  }
  function handleShowLineNumbers(checked: boolean) {
    useUserSettingsStore.setState({ editorShowLineNumbers: checked });
  }

  useHotkeys(toggleEditorPreferences[0].hotKey, () => {
    handleEditorViewPreferences(
      editorPreference === "default" ? "minimal" : "default"
    );
  });

  useHotkeys(toggleEditorLineNumbers[0].hotKey, () => {
    handleShowLineNumbers(editorShowLineNumbers === true ? false : true);
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Tooltip content="Editor Options" side="right" sideOffset={16}>
            <i className="ri-more-2-fill text-lg" />
          </Tooltip>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" sideOffset={12}>
        <DropdownMenuLabel>Editor Preferences</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={editorPreference}
          onValueChange={(value: string) =>
            handleEditorViewPreferences(value as EditorViewPreference)
          }
        >
          <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="minimal">Minimal</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={editorShowLineNumbers}
          onCheckedChange={(checked: boolean) => handleShowLineNumbers(checked)}
        >
          Show line numbers
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
