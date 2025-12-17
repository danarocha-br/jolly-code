"use client";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";

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
import { useEditorStore, useUserStore } from "@/app/store";
import { Tooltip } from "@/components/ui/tooltip";
import { hotKeyList } from "@/lib/hot-key-list";
import { 
  useWatermarkPreference, 
  useUpdateWatermarkPreference,
  useUserPlan 
} from "@/features/user/queries";

type EditorViewPreference = "default" | "minimal";

const toggleEditorPreferences = hotKeyList.filter(
  (item) => item.label === "Toggle editor preferences"
);
const toggleEditorLineNumbers = hotKeyList.filter(
  (item) => item.label === "Toggle editor line numbers"
);

export const EditorOptionsMenu = () => {
  const { user } = useUserStore();
  const userId = user?.id;
  
  const currentState = useEditorStore((state) => state.currentEditorState);
  const editor = useEditorStore((state) => state.editor);

  const [editorPreference, setEditorPreference] =
    useState<EditorViewPreference>(editor);

  const { editorShowLineNumbers } = useEditorStore(
    useShallow((state) => {
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
    })
  );

  // Watermark preference hooks
  const { data: watermarkPref, isLoading: isWatermarkLoading } = useWatermarkPreference(userId);
  const { data: userPlan } = useUserPlan(userId);
  const updateWatermarkMutation = useUpdateWatermarkPreference(userId);

  const isPro = userPlan === 'pro';
  const hideWatermark = watermarkPref?.hideWatermark ?? false;

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
    // Update BOTH per-tab setting AND global setting
    // This ensures the preference applies to:
    // 1. Current code editor tab (per-tab setting)
    // 2. Animation view (global setting)
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
      showLineNumbers: checked, // Global setting for animation view
    });
  }

  function handleHideWatermark(checked: boolean) {
    if (!userId) {
      toast.error("Please sign in to update preferences");
      return;
    }

    if (checked && !isPro) {
      toast.error("Upgrade to PRO to remove watermarks", {
        description: "PRO plan unlocks watermark-free exports and embeds",
      });
      return;
    }

    updateWatermarkMutation.mutate(checked, {
      onSuccess: () => {
        toast.success(
          checked 
            ? "Watermark will be hidden from your exports" 
            : "Watermark will be shown on your exports"
        );
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : "Failed to update preference";
        toast.error(message);
      },
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

  const keepMenuOpen = (event: Event) => {
    event.preventDefault();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="not-dark:hover:bg-subdued">
          <Tooltip content="Editor Options" side="right" sideOffset={16}>
            <i className="ri-settings-line text-lg" />
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
          <DropdownMenuRadioItem inset value="default" onSelect={keepMenuOpen}>Default</DropdownMenuRadioItem>
          <DropdownMenuRadioItem inset value="minimal" onSelect={keepMenuOpen}>Minimal</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          inset
          checked={editorShowLineNumbers}
          onSelect={keepMenuOpen}
          onCheckedChange={(checked: boolean) => handleShowLineNumbers(checked)}
        >
          Show line numbers
        </DropdownMenuCheckboxItem>

        {userId && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              inset
              checked={hideWatermark}
              onSelect={keepMenuOpen}
              onCheckedChange={(checked: boolean) => handleHideWatermark(checked)}
              disabled={isWatermarkLoading || updateWatermarkMutation.isPending}
            >
              <div className="flex items-center gap-2">
                <span>Hide watermark</span>
                {!isPro && (
                  <span className="text-xs text-muted-foreground">(PRO)</span>
                )}
              </div>
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
