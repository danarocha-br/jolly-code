import React, { useState } from "react";

import { Button } from "../ui/button";
import {
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";
import { useUserSettingsStore } from "@/app/store";
import { Tooltip } from "../ui/tooltip";

type EditorViewPreference = "default" | "minimal";

export const EditorOptionsMenu = () => {
  const editor = useUserSettingsStore((state) => state.editor);

  const [editorPreference, setEditorPreference] =
    useState<EditorViewPreference>(editor);

  const editorShowLineNumbers = useUserSettingsStore(
    (state) => state.editorShowLineNumbers
  );

  const [showLineNumbers, setShowLineNumbers] = useState(editorShowLineNumbers);

  function changeEditorViewPreference(value: EditorViewPreference) {
    const userSettings = useUserSettingsStore.getState();
    const updatedSettings = { ...userSettings, editor: value };
    useUserSettingsStore.setState(updatedSettings);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Tooltip content="Editor Options" side='right' sideOffset={16}>
            <i className="ri-more-2-fill text-lg" />
          </Tooltip>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="right" sideOffset={12}>
        <DropdownMenuLabel>Editor Preferences</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={editorPreference}
          onValueChange={(value: string) => {
            setEditorPreference(value as EditorViewPreference);
            changeEditorViewPreference(value as EditorViewPreference);
          }}
        >
          <DropdownMenuRadioItem value="default">Default</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="minimal">Minimal</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={showLineNumbers}
          onCheckedChange={(checked: boolean) => {
            setShowLineNumbers(checked);
            useUserSettingsStore.setState({ editorShowLineNumbers: checked });
          }}
        >
          Show line numbers
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
