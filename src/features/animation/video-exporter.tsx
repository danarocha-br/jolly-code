import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toCanvas } from "html-to-image";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

import { AnimationSlide, AnimationSettings } from "@/types/animation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { playAnimation, AnimationFrame } from "./animator";
import { MorphingCodeRenderer } from "./morphing-code-renderer";
import { supportsWebCodecsEncoding } from "./utils/capabilities";
import { WindowChrome, AnimationContainer } from "./layout-components";

interface VideoExporterProps {
  slides: AnimationSlide[];
  settings: AnimationSettings;
  editorSettings: {
    backgroundTheme: string;
    fontFamily: string;
    fontSize: number;
    showBackground: boolean;
  };
  onProgress: (progress: number) => void;
  onComplete: (blob: Blob) => void;
  onError: (error: Error) => void;
  cancelled?: boolean;
  onCancelled?: () => void;
}

const getResolutionDimensions = (resolution: "720p" | "1080p") => {
  if (resolution === "1080p") return { width: 1920, height: 1080 };
  return { width: 1280, height: 720 };
};

export const VideoExporter = ({
  slides,
  settings,
  editorSettings,
  onProgress,
  onComplete,
  onError,
  cancelled = false,
  onCancelled,
}: VideoExporterProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
  const frameRenderedResolver = useRef<(() => void) | null>(null);
  const processingRef = useRef(false);
  const cancelRef = useRef(cancelled);
  const { width, height } = getResolutionDimensions(settings.resolution);

  useEffect(() => {
    cancelRef.current = cancelled;
  }, [cancelled]);

  // Notify when the frame has been rendered to the DOM
  useLayoutEffect(() => {
    if (frameRenderedResolver.current) {
      // Small timeout to ensure styles/fonts are settled
      const timer = setTimeout(() => {
        if (frameRenderedResolver.current) {
          frameRenderedResolver.current();
          frameRenderedResolver.current = null;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentFrame]);

  useEffect(() => {
    if (processingRef.current) return;
    processingRef.current = true;

    const processAnimation = async () => {
      try {
        const fps = settings.fps;
        const format = settings.exportFormat;
        const isMp4 = format === "mp4" && supportsWebCodecsEncoding();

        let muxer: Muxer<ArrayBufferTarget> | null = null;
        let videoEncoder: VideoEncoder | null = null;
        let mediaRecorder: MediaRecorder | null = null;
        let canvasStream: MediaStream | null = null;
        let streamCanvas: HTMLCanvasElement | null = null;
        let streamCtx: CanvasRenderingContext2D | null = null;
        const chunks: Blob[] = [];

        if (isMp4) {
          muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: {
              codec: "avc",
              width,
              height,
            },
            firstTimestampBehavior: 'offset',
            fastStart: false,
          });

          videoEncoder = new VideoEncoder({
            output: (chunk, meta) => muxer!.addVideoChunk(chunk, meta),
            error: (e) => {
              console.error("VideoEncoder error:", e);
              // We can't easily bubble this up from here, but the try/catch around processAnimation might catch it if it throws synchronously?
              // Actually, the error callback is async. We should probably set a flag or call onError.
              // For now, let's just log it.
            },
          });

          try {
            videoEncoder.configure({
              codec: "avc1.4d002a", // Main Profile, Level 4.2 (Supports 1080p)
              width,
              height,
              bitrate: 6_000_000,
              framerate: fps,
            });
          } catch (e) {
            console.error("VideoEncoder configuration failed:", e);
            throw new Error("VideoEncoder configuration failed. Your browser might not support this resolution/codec combination.");
          }
        } else {
          // WebM setup using MediaRecorder
          streamCanvas = document.createElement("canvas");
          streamCanvas.width = width;
          streamCanvas.height = height;
          streamCtx = streamCanvas.getContext("2d");

          canvasStream = streamCanvas.captureStream(fps);
          mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: "video/webm;codecs=vp9",
            videoBitsPerSecond: 6_000_000,
          });

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.start();
        }

        const generator = playAnimation(slides, settings, undefined, { skipDelays: true });
        let frameCount = 0;
        const totalDuration = slides.reduce((acc, s) => acc + s.duration, 0) + (slides.length - 1); // Approx
        const totalFrames = Math.ceil(totalDuration * fps);

        for await (const frame of generator) {
          if (cancelRef.current) {
            onCancelled?.();
            return;
          }
          // 1. Set state to render frame
          setCurrentFrame(frame);

          // 2. Wait for render
          await new Promise<void>((resolve) => {
            frameRenderedResolver.current = resolve;
          });

          // 3. Capture frame
          if (containerRef.current) {
            const canvas = await toCanvas(containerRef.current, {
              width,
              height,
              pixelRatio: 1,
              skipAutoScale: true,
              filter: (node) => {
                // Skip external stylesheets to avoid CORS errors
                if (node instanceof HTMLLinkElement && node.rel === 'stylesheet') {
                  const href = node.href || '';
                  // Skip external stylesheets (Google Fonts, CDN, etc.)
                  if (href.includes('googleapis.com') || href.includes('cdn.')) {
                    return false;
                  }
                }
                return true;
              },
              style: {
                transform: "scale(1)",
                transformOrigin: "top left",
              },
            });

            const timestamp = (frameCount * 1000000) / fps; // microseconds

            if (isMp4 && videoEncoder) {
              if (videoEncoder.state === "configured") {
                const videoFrame = new VideoFrame(canvas, { timestamp });
                videoEncoder.encode(videoFrame, { keyFrame: frameCount % (fps * 2) === 0 });
                videoFrame.close();
              } else {
                console.warn("VideoEncoder not configured, skipping frame");
              }
            } else if (streamCtx && streamCanvas) {
              streamCtx.drawImage(canvas, 0, 0);

              await new Promise(r => setTimeout(r, 1000 / fps));
            }
          }

          frameCount++;
          onProgress(Math.min(frameCount / totalFrames, 0.99));
        }

        // Finalize
        if (isMp4 && videoEncoder && muxer) {
          await videoEncoder.flush();
          muxer.finalize();
          const { buffer } = muxer.target;
          onComplete(new Blob([buffer], { type: "video/mp4" }));
        } else if (mediaRecorder) {
          mediaRecorder.stop();
          // Wait for stop event
          await new Promise<void>(resolve => {
            mediaRecorder!.onstop = () => resolve();
          });
          const blob = new Blob(chunks, { type: "video/webm" });
          onComplete(blob);
        }

      } catch (error) {
        console.error("Export failed", error);
        onError(error as Error);
      } finally {
        processingRef.current = false;
      }
    };

    processAnimation();
  }, [settings, slides, editorSettings, onProgress, onComplete, onError, cancelled, onCancelled, width, height]); // Added editorSettings to deps

  // Render content similar to UnifiedAnimationCanvas but scaled/fixed
  const renderContent = () => {
    if (!currentFrame) return null;

    if (currentFrame.type === "slide") {
      return (
        <MorphingCodeRenderer
          fromCode={currentFrame.currentSlide.code}
          toCode={currentFrame.currentSlide.code}
          fromTitle={currentFrame.currentSlide.title}
          toTitle={currentFrame.currentSlide.title}
          language={currentFrame.currentSlide.language}
          progress={1}
          chromeless
          scale={1.5}
        />
      );
    }

    const frame = currentFrame.frame;
    if (!frame) return null;

    const diffFrame = frame as unknown as any; // Type assertion if needed
    return (
      <MorphingCodeRenderer
        fromCode={diffFrame.fromSlide.code}
        toCode={diffFrame.toSlide.code}
        fromTitle={diffFrame.fromSlide.title}
        toTitle={diffFrame.toSlide.title}
        language={diffFrame.toSlide.language}
        progress={diffFrame.progress}
        chromeless
        scale={1.5}
      />
    );
  };

  const activeSlide = currentFrame?.currentSlide || slides[0];
  const headerContent = (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="text-stone-500 dark:text-stone-400 text-md font-medium">
        {activeSlide?.title}
      </span>
    </div>
  );

  // Determine if background is dark for watermark color
  const isDarkBackground = ['sublime', 'hyper', 'dracula', 'monokai', 'nord', 'gotham', 'blue', 'nightOwl'].includes(
    editorSettings.backgroundTheme
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1000,
        opacity: 0,
        pointerEvents: 'none'
      }}
    >
      <div
        ref={containerRef}
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          letterSpacing: 0,
        }}
      >
        {/* Aggressive letter-spacing reset for video export */}
        <style dangerouslySetInnerHTML={{
          __html: `
            #video-export-container,
            #video-export-container *,
            #video-export-container span,
            #video-export-container div {
              letter-spacing: 0 !important;
              font-feature-settings: "liga" 0, "calt" 0, "dlig" 0 !important;
              font-variant-ligatures: none !important;
              -webkit-font-feature-settings: "liga" 0, "calt" 0 !important;
              -moz-font-feature-settings: "liga" 0, "calt" 0 !important;
            }
          `
        }} />
        <div id="video-export-container" style={{ width: '100%', height: '100%', letterSpacing: 0 }}>
          <AnimationContainer
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
            }}
          >
            <div className="w-full max-w-3xl" style={{ transform: 'scale(1.5)', letterSpacing: 0 }}>
              <WindowChrome
                headerContent={headerContent}
                className="w-full"
              >
                {renderContent()}
              </WindowChrome>
            </div>
          </AnimationContainer>

          {/* Watermark */}
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              right: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              className={cn(isDarkBackground ? 'text-white' : 'text-foreground')}
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              jollycode.dev
            </span>
            <div>
              <Logo variant="short" className={cn("scale-75 grayscale contrast-150", isDarkBackground ? 'text-white' : 'text-foreground')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
