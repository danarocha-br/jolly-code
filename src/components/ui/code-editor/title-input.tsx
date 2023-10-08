"use client";

import React, { useCallback } from "react";
import { useUserSettingsStore } from "@/app/store";
import { input } from "./styles";
import { Button } from "../button";

type TitleInputProps = {
  icon: React.ReactNode;
  deletable?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Renders a TitleInput component.
 *
 * @param {React.ReactNode} icon - The icon to display.
 * @param {boolean} deletable - Whether the input is deletable or not. Default is false.
 * @param {string} defaultValue - The default value for the input.
 * @param {string} placeholder - The placeholder text for the input.
 * @param {Function} onChange - The function to call when the input value changes.
 * @return {React.ReactNode} The rendered TitleInput component.
 */
export const TitleInput = ({
  icon,
  deletable = false,
  ...props
}: TitleInputProps) => {
  const title = useUserSettingsStore((state) => state.title);
  const editor = useUserSettingsStore((state) => state.editor);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    useUserSettingsStore.setState({ title: e.target.value });
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (e.target instanceof HTMLTextAreaElement) {
      e.target.select();
    }
  }, []);

  return (
    <div className="flex gap-2 items-center justify-center w-full group/tab">
      <div className="flex items-center justify-center gap-2 pl-1 rounded-md !w-auto">
        {editor === "default" && (
          <span className="scale-90 flex items-end justify-center -ml-1">
            {icon}
          </span>
        )}

        <input
          className={input()}
          type="text"
          value={title}
          onChange={handleChange}
          spellCheck={false}
          onClick={handleClick}
          {...props}
        />

        {deletable && (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 transition-opacity opacity-0 group-hover/tab:opacity-100 !w-4 !h-4"
          >
            <i className="ri-close-line" />
          </Button>
        )}
      </div>
    </div>
  );
};
