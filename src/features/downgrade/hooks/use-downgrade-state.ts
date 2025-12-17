import { useState, useEffect, useTransition } from "react";
import type { DowngradeState, DowngradeActions } from "../dtos";
import type { DowngradeImpact } from "@/lib/utils/downgrade-impact";

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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setImpact(null);
      setSelectedSnippets(new Set());
      setSelectedAnimations(new Set());
      setDeletionCompleted(false);
      setImpactStale(false);
    }
  }, [open]);

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
    handleRefreshImpact: async (callback?: () => void | Promise<void>) => {
      if (callback) {
        try {
          await Promise.resolve(callback());
        } catch (error) {
          console.error("Error in refresh impact handler:", error);
        }
      }
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
