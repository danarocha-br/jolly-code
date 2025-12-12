import type { PlanId } from "@/lib/config/plans";
import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";
import type { Snippet } from "@/features/snippets/dtos";
import type { Animation } from "@/features/animations/dtos";

export type DowngradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanId;
  targetPlan?: PlanId;
  userId?: string;
};

export type ImpactRowProps = {
  label: string;
  current: number;
  max: number | null;
  overLimit: number;
  willBeOverLimit: boolean;
};

export type DowngradeState = {
  impact: DowngradeImpact | null;
  selectedSnippets: Set<string>;
  selectedAnimations: Set<string>;
  isLoadingImpact: boolean;
  isDeleting: boolean;
  isProceeding: boolean;
  deletionCompleted: boolean;
  impactStale: boolean;
};

export type DowngradeActions = {
  handleDeleteSelected: () => void;
  handleRefreshImpact: () => Promise<void>;
  handleProceedToDowngrade: () => void;
  toggleSnippetSelection: (snippetId: string) => void;
  toggleAnimationSelection: (animationId: string) => void;
  clearSnippetSelections: () => void;
  clearAnimationSelections: () => void;
  setSelectedSnippets: (snippets: Set<string>) => void;
  setSelectedAnimations: (animations: Set<string>) => void;
  setDeletionCompleted: (completed: boolean) => void;
  setImpactStale: (stale: boolean) => void;
  setImpact: (impact: DowngradeImpact | null) => void;
};

// Re-export types for convenience
export type { DowngradeImpact };
