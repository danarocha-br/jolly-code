import React from "react";

import { Separator } from '@/components/ui/separator/index';
import * as S from "./styles";

type CollectionCardProps = {
  id?: string;
  title: string;
  snippets?: string[];
  onSelect: () => void;
} & React.HTMLAttributes<HTMLButtonElement>;

export const CollectionCard = ({
  id,
  title,
  snippets,
  onSelect,
  ...props
}: CollectionCardProps) => {
  return (
    <button
      key={id}
      className={S.button()}
      onClick={() => onSelect()}
      {...props}
    >
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
          {snippets?.length ? (
            <span className="text-sm text-foreground/30">
              {snippets.length}
            </span>
          ) : (
            <span className="text-sm text-foreground/30">0</span>
          )}
        </p>
      </div>
    </button>
  );
};
