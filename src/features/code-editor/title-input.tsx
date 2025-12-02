"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UseMutateFunction } from "@tanstack/react-query";

import { useEditorStore } from "@/app/store";
import { debounce } from "@/lib/utils/debounce";
import { UpdateSnippetProps } from "@/features/snippets/queries";
import { TitleBarInput } from "@/components/ui/title-bar-input";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

type TitleInputProps = {
  userId: string;
  language: string;
  onUpdateTitle: UseMutateFunction<
    | {
      data: any;
    }
    | undefined,
    Error,
    UpdateSnippetProps,
    unknown
  >;
  disabled: boolean;
};

/**
 * Renders a title input component.
 *
 * @param {TitleInputProps} currentState - the current state of the component
 * @return {JSX.Element} - the rendered title input component
 */


export const TitleInput = ({
  language,
  userId,
  onUpdateTitle,
  ...props
}: TitleInputProps) => {
  const currentState = useEditorStore((state) => state.currentEditorState);
  const [localTitle, setLocalTitle] = useState(
    currentState?.title || "Untitled"
  );

  const editorPreferences = useEditorStore((state) => state.editor);

  const updateEditor = useEditorStore((state) => state.updateEditor);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalTitle(currentState?.title || "Untitled");
  }, [currentState?.title]);

  const debouncedUpdateSnippet = useMemo(
    () =>
      debounce((id: string, title: string) => {
        if (id && userId) {
          onUpdateTitle({
            id,
            title,
            user_id: userId,
          });
        }
      }, 1000),
    [onUpdateTitle, userId]
  );

  const handleChange = (newTitle: string) => {
    setLocalTitle(newTitle);

    if (currentState) {
      updateEditor(currentState.id, { title: newTitle });
      if (currentState.isSnippetSaved) {
        debouncedUpdateSnippet(currentState.id, newTitle);
      }
    }
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLInputElement) {
      e.target.select();
    }
  }, []);

  return (
    <TabsList>
      <TabsTrigger value="initial" className="relative">
        <TitleBarInput
          idKey={currentState?.id}
          value={localTitle}
          onChange={handleChange}
          language={language}
          editorPreferences={editorPreferences}
          placeholder="Untitled"
          disabled={props.disabled}
          onClick={handleClick}
        />
      </TabsTrigger>
    </TabsList>
  );
};
