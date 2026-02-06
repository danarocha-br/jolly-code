import { getPlanConfig, type PlanId } from "@/lib/config/plans";
import { formatLimit } from "../utils";

type PlanComparisonProps = {
  currentPlan: PlanId;
  targetPlan: PlanId;
};

export function PlanComparison({ currentPlan, targetPlan }: PlanComparisonProps) {
  const currentPlanConfig = getPlanConfig(currentPlan);
  const targetPlanConfig = getPlanConfig(targetPlan);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Plan comparison</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-semibold">Feature</th>
              <th className="text-center p-3 font-semibold">
                {currentPlanConfig.name}
              </th>
              <th className="text-center p-3 font-semibold">
                {targetPlanConfig?.name}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-3">Snippets</td>
              <td className="p-3 text-center">
                {formatLimit(currentPlanConfig.maxSnippets)}
              </td>
              <td className="p-3 text-center">
                {formatLimit(targetPlanConfig?.maxSnippets || 0)}
              </td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Animations</td>
              <td className="p-3 text-center">
                {formatLimit(currentPlanConfig.maxAnimations)}
              </td>
              <td className="p-3 text-center">
                {formatLimit(targetPlanConfig?.maxAnimations || 0)}
              </td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Slides per Animation</td>
              <td className="p-3 text-center">
                {formatLimit(currentPlanConfig.maxSlidesPerAnimation)}
              </td>
              <td className="p-3 text-center">
                {formatLimit(targetPlanConfig?.maxSlidesPerAnimation || 0)}
              </td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Folders</td>
              <td className="p-3 text-center">
                {formatLimit(currentPlanConfig.maxSnippetsFolder)}
              </td>
              <td className="p-3 text-center">
                {formatLimit(targetPlanConfig?.maxSnippetsFolder || 0)}
              </td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Video Exports</td>
              <td className="p-3 text-center">
                {formatLimit(currentPlanConfig.maxVideoExportCount)}
              </td>
              <td className="p-3 text-center">
                {formatLimit(targetPlanConfig?.maxVideoExportCount || 0)}
              </td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Public Shares</td>
              <td className="p-3 text-center">
                {formatLimit(currentPlanConfig.shareAsPublicURL)}
              </td>
              <td className="p-3 text-center">
                {formatLimit(targetPlanConfig?.shareAsPublicURL || 0)}
              </td>
            </tr>
            <tr className="border-t">
              <td className="p-3">Watermark Removal</td>
              <td className="p-3 text-center">
                {currentPlanConfig.removeWatermark ? (
                  <i className="ri-checkbox-circle-line text-success" />
                ) : (
                  <i className="ri-close-circle-line text-destructive" />
                )}
              </td>
              <td className="p-3 text-center">
                {targetPlanConfig?.removeWatermark ? (
                  <i className="ri-checkbox-circle-line text-success" />
                ) : (
                  <i className="ri-close-circle-line text-destructive" />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
