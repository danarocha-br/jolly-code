import React from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../hover-card";
import { Button } from "../../button";
import { Badge } from "../../badge";

import * as S from "./styles";
import Link from "next/link";

export const CodeAnnotationMenu = () => {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <Button size="icon" variant="ghost">
          <i className="ri-chat-1-line text-lg" />
        </Button>
      </HoverCardTrigger>

      <HoverCardContent side="right" sideOffset={12} className={S.content()}>
        <div>
          <Badge variant="secondary" className="w-auto">
            <i className="ri-star-fill text-amber-500 mr-3" />
            Coming soon
          </Badge>
        </div>
        <h2 className={S.title()}>Collaborative Code Annotation</h2>
        <p className={S.text()}>
          Hey folks, we are cooking up something exciting! Soon, you will be
          able to annotate code with your teammates. Cool, huh?
        </p>

        <p className={S.text()}>
          It opens the gate for fruitful dialogs around code, enhancing shared
          understanding & efficiency.
        </p>

        <Link
          href="https://jollycode.canny.io/feature-requests"
          target="_blank"
          className={S.ctaLink()}
        >
          Let us know what you think!
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
};
