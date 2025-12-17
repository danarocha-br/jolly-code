import { useState, useRef, useEffect, useTransition } from "react";
import type { DowngradeState, DowngradeActions } from "../dtos";
import type { Snippet } from "@/features/snippets/dtos";
import type { Animation } from "@/features/animations/dtos";
import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";
import { selectOldestSnippetItems, selectOldestAnimationItems } from "../utils";

export const useDowngradeState = (
  open: boolean
): DowngradeState & DowngradeActions => {
  const [impact, setImpact] = useState<DowngradeImpact | null>(null);
  const [selectedSnippets, setSelectedSnippets] = useState<Set<string>>(new Set());
  const [selectedAnimations, setSelectedAnimations] = useState<Set<string>>(new Set());
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isProceeding, startProceedTransition] = useTransition();
  const [deletionCompleted, setDeletionCompleted] = useState(false);
  const [impactStale, setImpactStale] = useState(false);
  const [isLoadingImpactTransition, startLoadingImpactTransition] = useTransition();

  const hasAutoSelectedSnippets = useRef(false);
  const hasAutoSelectedAnimations = useRef(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setImpact(null);
      setSelectedSnippets(new Set());
      setSelectedAnimations(new Set());
      setDeletionCompleted(false);
      setImpactStale(false);
      hasAutoSelectedSnippets.current = false;
      hasAutoSelectedAnimations.current = false;
    }
  }, [open]);

  // Auto-select oldest items when data loads
  const autoSelectItems = (
    items: Snippet[] | Animation[],
    impact: DowngradeImpact,
    type: 'snippets' | 'animations',
    hasAutoSelected: React.MutableRefObject<boolean>
  ) => {
    if (hasAutoSelected.current) return;

    const impactData = type === 'snippets' ? impact.snippets : impact.animations;
    if (!impactData.willBeOverLimit) return;

    const toSelect = type === 'snippets'
      ? selectOldestSnippetItems(items as Snippet[], impactData.overLimit)
      : selectOldestAnimationItems(items as Animation[], impactData.overLimit);

    startLoadingImpactTransition(() => {
      if (type === 'snippets') {
        setSelectedSnippets(new Set(toSelect));
      } else {
        setSelectedAnimations(new Set(toSelect));
      }
    });

    hasAutoSelected.current = true;
  };

  const toggleSnippetSelection = (snippetId: string) => {
    const newSet = new Set(selectedSnippets);
    if (newSet.has(snippetId)) {
      newSet.delete(snippetId);
    } else {
      newSet.add(snippetId);
    }
    setSelectedSnippets(newSet);
  };

  const toggleAnimationSelection = (animationId: string) => {
    const newSet = new Set(selectedAnimations);
    if (newSet.has(animationId)) {
      newSet.delete(animationId);
    } else {
      newSet.add(animationId);
    }
    setSelectedAnimations(newSet);
  };

  const clearSnippetSelections = () => setSelectedSnippets(new Set());
  const clearAnimationSelections = () => setSelectedAnimations(new Set());

  return {
    // State
    impact,
    selectedSnippets,
    selectedAnimations,
    isDeleting,
    isProceeding,
    deletionCompleted,
    impactStale,

    // Actions
    handleDeleteSelected: (callback?: () => void | Promise<void>) => {
      if (callback) {
        startDeleteTransition(() => {
          void Promise.resolve(callback()).catch((error) => {
            console.error("Error in delete handler:", error);
          });
        });
      }
    },
    handleRefreshImpact: async () => {
      // This will be implemented in the main component
    },
    handleProceedToDowngrade: (callback?: () => void | Promise<void>) => {
      if (callback) {
        startProceedTransition(() => {
          void Promise.resolve(callback()).catch((error) => {
            console.error("Error in proceed handler:", error);
          });
        });
      }
    },
    toggleSnippetSelection,
    toggleAnimationSelection,
    clearSnippetSelections,
    clearAnimationSelections,
    setSelectedSnippets,
    setSelectedAnimations,
    setDeletionCompleted,
    setImpactStale,
    setImpact,
  };
};
