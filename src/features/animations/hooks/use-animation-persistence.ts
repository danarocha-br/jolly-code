"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";

import { useAnimationStore } from "@/app/store";
import { createAnimation, removeAnimation, updateAnimation } from "@/features/animations/queries";
import { debounce } from "@/lib/utils/debounce";
import { trackAnimationEvent } from "@/features/animation/analytics";
import { USAGE_QUERY_KEY } from "@/features/user/queries";
import { AnimationSlide, AnimationSettings } from "@/types/animation";
import { User } from "@supabase/supabase-js";
import { calculateTotalDuration } from "@/features/animation";
import { toast } from "sonner";
import { useAnimationLimits } from "./use-animation-limits";

type UseAnimationPersistenceProps = {
  user: User | null;
  slides: AnimationSlide[];
  animationSettings: AnimationSettings;
};

export function useAnimationPersistence({
  user,
  slides,
  animationSettings,
}: UseAnimationPersistenceProps) {
  const queryClient = useQueryClient();
  const user_id = user?.id;

  const animationId = useAnimationStore((state) => state.animationId);
  const isAnimationSaved = useAnimationStore((state) => state.isAnimationSaved);
  const setAnimationId = useAnimationStore((state) => state.setAnimationId);
  const setIsAnimationSaved = useAnimationStore((state) => state.setIsAnimationSaved);
  const updateActiveAnimation = useAnimationStore((state) => state.updateActiveAnimation);

  const animationTitle = slides?.[0]?.title || "Untitled animation";
  const totalDuration = calculateTotalDuration(slides);
  const lastAutoSaveRef = useRef<number | null>(null);

  const getTimestamp = () => new Date().getTime();

  const { setIsUpgradeOpen } = useAnimationLimits({ user, slidesCount: slides.length });

  // --- Mutations ---

  const { mutate: handleCreateAnimation, isPending: isCreating } = useMutation({
    mutationFn: createAnimation,
    onSuccess: (result: any) => {
      if (result?.error) {
        toast.error(result.error);
        setIsUpgradeOpen(true);
        return;
      }
      if (result?.data) {
        updateActiveAnimation(result.data);
        trackAnimationEvent("create_animation", user, {
          animation_id: result.data.id,
          slide_count: slides.length,
          duration: totalDuration,
          has_custom_title: animationTitle !== "Untitled animation",
          transition_type: animationSettings.transitionType,
          export_format: animationSettings.exportFormat,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["animation-collections"] });
      if (user_id) {
        queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, user_id] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to save animation.");
      setIsUpgradeOpen(true);
    },
  });

  const { mutate: handleUpdateAnimation } = useMutation({
    mutationFn: updateAnimation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["animation-collections"] });
    },
    onError: () => {
      // If update fails (e.g., unsaved animation), mark as unsaved to avoid repeat attempts
      setIsAnimationSaved(false);
    },
  });

  const { mutate: handleRemoveAnimation, isPending: isRemoving } = useMutation({
    mutationFn: removeAnimation,
    onSuccess: () => {
      if (animationId) {
        trackAnimationEvent("delete_animation", user, {
          animation_id: animationId,
        });
      }
      setIsAnimationSaved(false);
      setAnimationId(undefined);
      queryClient.invalidateQueries({ queryKey: ["animation-collections"] });
      if (user_id) {
        queryClient.invalidateQueries({ queryKey: [USAGE_QUERY_KEY, user_id] });
      }
    },
  });

  // --- Auto-Save Logic ---

  const debouncedUpdateAnimation = useRef<
    ((id: string, slidesPayload: typeof slides, settingsPayload: typeof animationSettings) => void) | null
  >(null);

  useEffect(() => {
    debouncedUpdateAnimation.current = debounce(
      (id: string, slidesPayload: typeof slides, settingsPayload: typeof animationSettings) => {
        if (id && isAnimationSaved) {
          const now = getTimestamp();
          const timeSinceLastSave = lastAutoSaveRef.current
            ? (now - lastAutoSaveRef.current) / 1000
            : null;
          lastAutoSaveRef.current = now;
          trackAnimationEvent("animation_auto_saved", user, {
            animation_id: id,
            slide_count: slidesPayload.length,
            time_since_last_save: timeSinceLastSave,
          });
          handleUpdateAnimation({
            id,
            user_id,
            title: animationTitle,
            slides: slidesPayload,
            settings: settingsPayload,
          });
        }
      },
      1000
    );
  }, [animationTitle, handleUpdateAnimation, isAnimationSaved, user, user_id]);

  useEffect(() => {
    if (isAnimationSaved && animationId && user_id) {
      debouncedUpdateAnimation.current?.(animationId, slides, animationSettings);
    }
  }, [animationId, animationSettings, isAnimationSaved, slides, user_id]);

  // --- Public Handlers ---

  const saveAnimation = useCallback(() => {
    if (!user_id) return;

    // If it's a new animation (no ID yet), generate one
    const newId = animationId || uuidv4();
    const currentUrlOrigin = typeof window !== "undefined" ? window.location.href : "";

    handleCreateAnimation({
      id: newId,
      user_id,
      currentUrl: currentUrlOrigin,
      title: animationTitle,
      slides,
      settings: animationSettings,
    });
  }, [
    animationId,
    animationSettings,
    animationTitle,
    handleCreateAnimation,
    slides,
    user_id,
  ]);

  const removeCurrentAnimation = useCallback(() => {
    if (!animationId || !user_id) return;

    handleRemoveAnimation({
      animation_id: animationId,
      user_id,
    });
  }, [animationId, handleRemoveAnimation, user_id]);

  return {
    saveAnimation,
    removeCurrentAnimation,
    isCreating,
    isRemoving,
  };
}
