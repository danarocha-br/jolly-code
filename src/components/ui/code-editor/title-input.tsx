"use client";

import React, { useCallback, useEffect, useState } from "react";

import { useEditorStore } from "@/app/store";
import { input } from "./styles";
import { languagesLogos } from "@/lib/language-logos";

type TitleInputProps = {
  language: string;
  // deletable?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Renders a title input component.
 *
 * @param {TitleInputProps} currentState - the current state of the component
 * @return {JSX.Element} - the rendered title input component
 */
export const TitleInput = ({ language, ...props }: TitleInputProps) => {
  const currentState = useEditorStore((state) => state.currentEditorState);
  const [localTitle, setLocalTitle] = useState(
    currentState?.title || "Untitled"
  );

  const editorPreferences = useEditorStore((state) => state.editor);

  const updateEditor = useEditorStore((state) => state.updateEditor);

  useEffect(() => {
    setLocalTitle(currentState?.title || "Untitled");
  }, [currentState]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTitle(e.target.value);
    if (currentState) {
      updateEditor(currentState.id, { title: e.target.value });
    }
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.select();
    }
  }, []);

  return (
    <div className="flex gap-2 items-center justify-center w-full group/tab">
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

        {/* {deletable && (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 transition-opacity opacity-0 group-hover/tab:opacity-100 !w-4 !h-4"
          >
            <i className="ri-close-line" />
          </Button>
        )} */}
      </div>
    </div>
  );
};
