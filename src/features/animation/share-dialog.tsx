"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { useAnimationStore, useEditorStore, useUserStore } from "@/app/store";
import {
  AnimationSharePayload,
  encodeAnimationSharePayload,
} from "./share-utils";
import { trackAnimationEvent } from "@/features/animation/analytics";

export const AnimationShareDialog = () => {
  const user = useUserStore((state) => state.user);
  const slides = useAnimationStore((state) => state.slides);
  const animationSettings = useAnimationStore((state) => state.animationSettings);

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const showBackground = useEditorStore((state) => state.showBackground);

  const [open, setOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.origin);
  }, []);

  const serializedSlides = useMemo(
    () =>
      slides.map((slide) => ({
        id: slide.id,
        code: slide.code,
        title: slide.title,
        language: slide.language,
        autoDetectLanguage: slide.autoDetectLanguage,
        duration: slide.duration,
      })),
    [slides]
  );

  const payload = useMemo<AnimationSharePayload>(
    () => ({
      slides: serializedSlides,
      settings: animationSettings,
      editor: {
        backgroundTheme,
        fontFamily,
        fontSize,
        showBackground,
      },
    }),
    [animationSettings, backgroundTheme, fontFamily, fontSize, serializedSlides, showBackground]
  );

  const shortenUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch("/api/shorten-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id,
          snippet_id: "",
          url,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to shorten URL");
      }

      const data = await response.json();
      return data.short_url as string;
    },
  });

  const generateShareUrl = useCallback(async () => {
    if (!currentUrl) {
      return;
    }

    if (serializedSlides.length < 2) {
      toast.error("Add at least two slides to share an animation.");
      return;
    }

    try {
      const encodedPayload = encodeAnimationSharePayload(payload);
      const storedValue = `animation:${encodedPayload}`;

      const shortUrl = await shortenUrlMutation.mutateAsync(storedValue);
      const fullUrl = `${currentUrl}/animate/shared/${shortUrl}`;

      setShareUrl(fullUrl);
      trackAnimationEvent("share_animation_link", user, {
        slide_count: serializedSlides.length,
        has_title: Boolean(slides[0]?.title?.trim()),
        has_description: false,
        url_generated: Boolean(fullUrl),
      });
    } catch (error) {
      console.error("Failed to generate share URL", error);
      toast.error("Oh no, something went wrong. Please try again.");
    }
  }, [currentUrl, payload, serializedSlides.length, shortenUrlMutation, user, slides]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      trackAnimationEvent("copy_link", user, {
        from: "share_dialog",
        link_type: "animation",
      });
      toast.success("Link copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy animation link", error);
      toast.error("Unable to copy link. Please try again.");
    } finally {
      setIsCopying(false);
    }
  }, [shareUrl, user]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void generateShareUrl();
    }
  };

  const isGenerating = shortenUrlMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip content="Share animation link">
        <DialogTrigger asChild>
          <Button size="sm" className="whitespace-nowrap">
            <i className="ri-share-forward-line text-lg mr-2"></i>
            Share
          </Button>
        </DialogTrigger>
      </Tooltip>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share animation</DialogTitle>
          <DialogDescription>
            Generate a public link that plays your animation on loop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="animation-share-url">Public URL</Label>
          <div className="flex items-center gap-2">
            <Input
              id="animation-share-url"
              value={shareUrl}
              readOnly
              placeholder={isGenerating ? "Generating link..." : "Generate a link to share"}
            />
            <Button
              variant="secondary"
              onClick={handleCopy}
              disabled={!shareUrl || isGenerating || isCopying}
            >
              {isCopying ? "Copying..." : "Copy"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={generateShareUrl} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Refresh link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
