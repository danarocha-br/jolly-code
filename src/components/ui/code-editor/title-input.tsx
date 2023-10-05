"use client";

import React from "react";
import { useUserSettingsStore } from "@/app/store";
import { input } from "./styles";
import { Button } from "../button";

type TitleInputProps = {
  icon: React.ReactNode;
  deletable?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

export const TitleInput = ({
  icon,
  deletable = false,
  ...props
}: TitleInputProps) => {
  const title = useUserSettingsStore((state) => state.title);
  const editor = useUserSettingsStore((state) => state.editor);

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
          onChange={(e) => {
            useUserSettingsStore.setState({ title: e.target.value });
          }}
          spellCheck={false}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
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
