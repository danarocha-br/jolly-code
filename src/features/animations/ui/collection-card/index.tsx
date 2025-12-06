import React from "react";

import { Separator } from "@/components/ui/separator/index";
import * as S from "./styles";

type CollectionCardProps = {
  id?: string;
  title: string;
  animations?: string[];
  onSelect: () => void;
  isLoading?: boolean;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

export const AnimationCollectionCard = ({
  id,
  title,
  animations,
  onSelect,
  isLoading = false,
  disabled = false,
  ...props
}: CollectionCardProps) => {
  return (
    <button
      key={id}
      className={S.button()}
      onClick={() => onSelect()}
      disabled={disabled || isLoading}
      style={{ opacity: disabled ? 0.5 : 1 }}
      {...props}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10">
          <i className="ri-loader-4-fill text-2xl animate-spin text-primary" />
        </div>
      )}

      <div className={S.editorContainer()}>
        <div className={S.editorContent()}>
          <div className={S.editorHeader()}>
            <div className="flex gap-1">
              <span className={S.editorButtons()} />
              <span className={S.editorButtons()} />
              <span className={S.editorButtons()} />
            </div>

            <span className={S.editorTitle()}>{title}</span>

            <div />
            <div />
          </div>
        </div>
      </div>

      <Separator />

      <div className="w-full flex items-center justify-between gap-2 px-4 py-2">
        <h2 className="capitalize truncate">{title}</h2>
        <p className="text-sm">
          {animations?.length ? (
            <span className="text-sm text-foreground/30">{animations.length}</span>
          ) : (
            <span className="text-sm text-foreground/30">0</span>
          )}
        </p>
      </div>
    </button>
  );
};
