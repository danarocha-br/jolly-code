import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";
import { ImpactRow } from "./impact-row";

type ImpactSummaryProps = {
  impact: DowngradeImpact;
};

export function ImpactSummary({ impact }: ImpactSummaryProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Impact summary</h3>

      <div className="grid grid-cols-4 gap-2">
        <ImpactRow
          label="Snippets"
          current={impact.snippets.current}
          max={impact.snippets.max}
          overLimit={impact.snippets.overLimit}
          willBeOverLimit={impact.snippets.willBeOverLimit}
        />
        <ImpactRow
          label="Animations"
          current={impact.animations.current}
          max={impact.animations.max}
          overLimit={impact.animations.overLimit}
          willBeOverLimit={impact.animations.willBeOverLimit}
        />
        <ImpactRow
          label="Folders"
          current={impact.folders.current}
          max={impact.folders.max}
          overLimit={impact.folders.overLimit}
          willBeOverLimit={impact.folders.willBeOverLimit}
        />
        <ImpactRow
          label="Video Exports"
          current={impact.videoExports.current}
          max={impact.videoExports.max}
          overLimit={impact.videoExports.overLimit}
          willBeOverLimit={impact.videoExports.willBeOverLimit}
        />
        <ImpactRow
          label="Public Shares"
          current={impact.publicShares.current}
          max={impact.publicShares.max}
          overLimit={impact.publicShares.overLimit}
          willBeOverLimit={impact.publicShares.willBeOverLimit}
        />
      </div>
    </div>
  );
}
