import { Button } from "@/components/ui/button";
import { LoginDialog } from "@/feature-login";
import * as S from "./styles";

export function SnippetCallout() {
  return (
    <div className="w-full relative px-4">
      <div className={S.emptyContainer()}>
        <div className={S.emptyIcon()}>
          <i className="ri-bookmark-line" />
        </div>

        <div className={S.emptyCard()}>
          <div className="flex flex-col gap-2 w-full mt-9">
            <div className={S.emptyLines()} />
            <div className={S.emptyLines()} />
          </div>
        </div>

        <h4 className="text-foreground/90 relative -top-5">Saved snippets</h4>

        <p className={S.emptyDescription()}>
          Save your code snippets for future reference directly in the tool.
        </p>

        <LoginDialog>
          <Button variant="secondary" className="w-full">
            Login
          </Button>
        </LoginDialog>
      </div>
    </div>
  );
}
