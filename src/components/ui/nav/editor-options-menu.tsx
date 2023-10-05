import React, { useState } from "react";

import { Button } from "../button";
import {
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "../dropdown-menu";
import { useUserSettingsStore } from "@/app/store";

type EditorViewPreference = "default" | "minimal";

export const EditorOptionsMenu = () => {
  const editor = useUserSettingsStore(
    (state) => state.editor
  );

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
        <Button variant="secondary" size="icon">
          <i className="ri-more-2-fill text-lg" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
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
