"use client";

import type React from "react";
import { languagesLogos } from "@/lib/language-logos";
import { input as titleInputClass } from "@/features/code-editor/styles";

type TitleBarInputProps = {
  value: string;
  onChange: (value: string) => void;
  language: string;
  editorPreferences: "default" | "minimal";
  idKey?: string;
  placeholder?: string;
  disabled?: boolean;
  showLanguageLogo?: boolean;
  onClick?: (event: React.MouseEvent<HTMLInputElement>) => void;
};

export const TitleBarInput = ({
  value,
  onChange,
  language,
  editorPreferences,
  idKey,
  placeholder = "Untitled",
  disabled,
  showLanguageLogo = true,
  onClick,
}: TitleBarInputProps) => {
  const displayValue = value ?? placeholder ?? "";

  return (
    <div
      key={idKey}
      className="flex gap-2 items-center justify-center w-full group/tab"
    >
      <div className="flex items-center justify-center gap-2 pl-1 rounded-md !w-auto">
        {showLanguageLogo && editorPreferences === "default" && (
          <span className="scale-90 flex items-end justify-center -ml-1">
            {languagesLogos[language as keyof typeof languagesLogos]}
          </span>
        )}

        <input
          className={titleInputClass()}
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder={placeholder}
          disabled={disabled}
          onClick={onClick}
        />
      </div>
    </div>
  );
};
