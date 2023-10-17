import React from "react";
import { Button } from "../../button";

import * as S from "./styles";

type SnippetsEmptyStateProps = {
  show: boolean;
};

type SnippetsProps = {
  show: boolean;
};

export const EmptyState = ({ show }: SnippetsEmptyStateProps) => {
  return (
    <div className="w-full px-4 mt-12">
      <div className={S.emptyContainer({ show })}>
        <div className={S.emptyCard()}>
          <div className={S.emptyIcon()}>
            <i className="ri-bookmark-line" />
          </div>

          <div className="flex flex-col gap-2 mt-8 w-full">
            <div className={S.emptyLines()} />
            <div className={S.emptyLines()} />
          </div>
        </div>

        {/* <h4 className="text-foreground/90">No saved snippets yet</h4> */}
        <h4 className={S.emptyTitle({ show })}>Coming soon!</h4>

        <p className={S.emptyDescription({ show })}>
          {/* Start by creating a folder or saving a code snippet. */}
          Save your code snippets for future reference directly in the tool.
        </p>

        <Button variant="secondary" className="w-[220px]">
          Create a folder
        </Button>
      </div>
    </div>
  );
};

export const Snippets = ({ show }: SnippetsProps) => {
  return show ? <EmptyState show={show} /> : null;
};
