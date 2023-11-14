import React, { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Button } from "@/components/ui/button";
import {
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useEditorStore } from "@/app/store";
import { Tooltip } from "@/components/ui/tooltip";
import { hotKeyList } from "@/lib/hot-key-list";

type EditorViewPreference = "default" | "minimal";

const toggleEditorPreferences = hotKeyList.filter(
  (item) => item.label === "Toggle editor preferences"
);
const toggleEditorLineNumbers = hotKeyList.filter(
  (item) => item.label === "Toggle editor line numbers"
);

export const EditorOptionsMenu = () => {
  const currentState = useEditorStore((state) => state.currentEditorState);
  const editor = useEditorStore((state) => state.editor);

  const [editorPreference, setEditorPreference] =
    useState<EditorViewPreference>(editor);

  const { editorShowLineNumbers } = useEditorStore((state) => {
    const editor = state.editors.find(
      (editor) => editor.id === currentState?.id
    );
    return editor
      ? {
          editorShowLineNumbers: editor.editorShowLineNumbers,
        }
      : {
          editorShowLineNumbers: false,
        };
  });

  function changeEditorViewPreference(value: EditorViewPreference) {
    const userSettings = useEditorStore.getState();
    const updatedSettings = { ...userSettings, editor: value };
    useEditorStore.setState(updatedSettings);
  }

  function handleEditorViewPreferences(value: EditorViewPreference) {
    setEditorPreference(value);
    changeEditorViewPreference(value);
  }
  function handleShowLineNumbers(checked: boolean) {
    useEditorStore.setState({
      editors: useEditorStore.getState().editors.map((editor) => {
        if (editor.id === currentState?.id) {
          return {
            ...editor,
            editorShowLineNumbers: checked,
          };
        }
        return editor;
      }),
    });
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
