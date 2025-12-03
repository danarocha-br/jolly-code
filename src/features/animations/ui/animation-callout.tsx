import { LoginDialog } from "@/features/login";
import * as S from "./styles";

export function AnimationCallout() {
  return (
    <div className="w-full relative px-4">
      <div className={S.emptyContainer()}>
        <div className={S.emptyIcon()}>
          <i className="ri-movie-line" />
        </div>

        <div className={S.emptyCard()}>
          <div className="flex flex-col gap-2 w-full mt-9">
            <div className={S.emptyLines()} />
            <div className={S.emptyLines()} />
          </div>
        </div>

        <h4 className="text-foreground/90 relative -top-5">Saved animations</h4>

        <p className={S.emptyDescription()}>
          Save and organize your animations to reuse them later.
        </p>

        <LoginDialog>
          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 w-full">
            Login
          </button>
        </LoginDialog>
      </div>
    </div>
  );
}
