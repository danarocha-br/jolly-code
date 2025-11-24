"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UseMutateFunction } from "@tanstack/react-query";

import { useEditorStore } from "@/app/store";
import { languagesLogos } from "@/lib/language-logos";
import { debounce } from "@/lib/utils/debounce";
import { UpdateSnippetProps } from "@/feature-snippets/queries";
import { input } from "./styles";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    if (currentState) {
      updateEditor(currentState.id, { title: newTitle });
      currentState.isSnippetSaved &&
        console.log('')
        debouncedUpdateSnippet(currentState.id, newTitle);
    }
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.select();
    }
  }, []);

  return (
    <div
      key={currentState?.id}
      className="flex gap-2 items-center justify-center w-full group/tab"
    >
      <div className="flex items-center justify-center gap-2 pl-1 rounded-md !w-auto">
        {editorPreferences === "default" && (
          <span className="scale-90 flex items-end justify-center -ml-1">
            {languagesLogos[language as keyof typeof languagesLogos]}
          </span>
        )}

        <input
          className={input()}
          type="text"
          value={localTitle}
          onChange={handleChange}
          spellCheck={false}
          onClick={handleClick}
          {...props}
        />
      </div>
    </div>
  );
};
