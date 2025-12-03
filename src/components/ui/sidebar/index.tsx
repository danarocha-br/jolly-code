"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';

import { Button } from "../button";
import { Logo } from "../logo";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";
import { Separator } from "../separator";
import { Tooltip } from "../tooltip";
import { useEditorStore, useUserStore } from "@/app/store";
import { LoginDialog } from "@/features/login";
import { CreateCollectionDialog } from '@/features/snippets/create-collection-dialog';
import { Snippets } from '@/features/snippets';
import { Animations } from "@/features/animations";
import { CreateAnimationCollectionDialog } from "@/features/animations/create-collection-dialog";
import * as S from "./styles";

const themeMapping: { [key in "dark" | "light"]: "dark" | "light" } = {
  dark: "light",
  light: "dark",
};

export const SIDEBAR_COLLAPSED_WIDTH = 50;
export const SIDEBAR_EXPANDED_WIDTH = 300;

/**
 * Generates a custom hook that handles mouse events for the sidebar.
 *
 * @return {Object} An object containing the following properties:
 *   - width: The current width of the sidebar.
 *   - handleMouseMove: A callback function to handle mouse move events.
 *   - handleMouseLeave: A callback function to handle mouse leave events.
 */
const useSidebarMouseEvents = () => {
  const [width, setWidth] = useState(SIDEBAR_COLLAPSED_WIDTH);
  const collapseTimeout = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hasOpenPortals = useRef(false);
  const setHasOpenPortals = useCallback((value: boolean) => {
    if (value && collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    hasOpenPortals.current = value;
  }, []);

  // Monitor for Radix UI portals being added/removed from the DOM
  React.useEffect(() => {
    const checkForPortals = () => {
      const portals = document.querySelectorAll(
        '[data-radix-popper-content-wrapper], [data-radix-dropdown-menu-content], [data-radix-hover-card-content], [data-radix-portal]'
      );
      hasOpenPortals.current = portals.length > 0;
    };

    // Initial check
    checkForPortals();

    // Set up a MutationObserver to watch for portal changes
    const observer = new MutationObserver(() => {
      checkForPortals();
    });

    // Observe the body for added/removed portals
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const handlePointerEnter = useCallback(() => {
    // Cancel any pending collapse when the pointer enters
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    const newWidth = SIDEBAR_EXPANDED_WIDTH;
    setWidth(newWidth);
  }, []);

  const handlePointerLeave = useCallback(() => {
    // Don't collapse if there are open portals (dropdowns, etc.)
    if (hasOpenPortals.current) {
      return;
    }

    // Start a timeout before collapsing
    collapseTimeout.current = setTimeout(() => {
      // Double-check portals before collapsing
      if (!hasOpenPortals.current) {
        setWidth(SIDEBAR_COLLAPSED_WIDTH);
        collapseTimeout.current = null;
      }
    }, 300);
  }, []);

  const closeSidebar = useCallback(() => {
    // Immediate collapse when user clicks the close button
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    setWidth(SIDEBAR_COLLAPSED_WIDTH);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  }, [width]);

  return { width, handlePointerEnter, handlePointerLeave, closeSidebar, sidebarRef, setHasOpenPortals };
};

export const Sidebar = () => {
  const { theme, setTheme } = useTheme();
  const { width, handlePointerEnter, handlePointerLeave, closeSidebar, sidebarRef, setHasOpenPortals } = useSidebarMouseEvents();
  const router = useRouter();
  const pathname = usePathname();

  const user = useUserStore((state) => state.user);
  const isPresentational = useEditorStore((state) => state.presentational);
  const memoizedTheme = useMemo(() => theme, [theme]);
  const showSidebarContent = useMemo(() => SIDEBAR_COLLAPSED_WIDTH !== width, [width]);
  const isAnimationEditor = useMemo(() => pathname?.startsWith("/animate") ?? false, [pathname]);
  const sidebarTitle = isAnimationEditor ? "My Animations" : "My Snippets";

  return (
    <aside className="hidden lg:flex">
      <motion.div
        ref={sidebarRef}
        className={S.container({
          isPresentational,
        })}
        animate={{ width }}
        transition={{ ease: "easeOut", duration: 0.3 }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <Button
          size="icon"
          variant="ghost"
          className="hidden lg:flex mt-2 absolute left-2"
          onClick={() =>
            setTheme(
              themeMapping[(memoizedTheme as "dark" | "light") || "dark"]
            )
          }
        >
          {memoizedTheme === "dark" ? (
            <i className="ri-moon-fill text-lg" />
          ) : (
            <i className="ri-sun-fill text-lg" />
          )}
        </Button>

        <h2 className={S.title({ show: showSidebarContent })}>{sidebarTitle}</h2>

        {showSidebarContent && (
          <div className="absolute right-2 top-3">
            <Tooltip content={isAnimationEditor ? "Add animation folder" : "Add folder"}>
              {user ? (
                isAnimationEditor ? (
                  <CreateAnimationCollectionDialog>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full not-dark:bg-white not-dark:bg-white/80"
                    >
                      <i className="ri-add-line" />
                    </Button>
                  </CreateAnimationCollectionDialog>
                ) : (
                  <CreateCollectionDialog>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="rounded-full not-dark:bg-white not-dark:bg-white/80"
                    >
                      <i className="ri-add-line" />
                    </Button>
                  </CreateCollectionDialog>
                )
              ) : (
                <LoginDialog>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full"
                  >
                    <i className="ri-add-line" />
                  </Button>
                </LoginDialog>
              )}
            </Tooltip>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, width: 320, padding: 24 }}
          animate={{ opacity: showSidebarContent ? 1 : 0 }}
          transition={{
            delay: showSidebarContent ? 0.1 : 0,
            duration: showSidebarContent ? 0.2 : 0.1,
          }}
        >
          {isAnimationEditor ? <Animations /> : <Snippets />}
        </motion.div>

        <div className="absolute bottom-3 left-2">
          <HoverCard
            openDelay={0}
            closeDelay={120}
            onOpenChange={setHasOpenPortals}
          >
            <HoverCardTrigger asChild>
              <button type="button" className={S.logoShort({ show: showSidebarContent })}>
                <Logo variant="short" />
              </button>
            </HoverCardTrigger>

            <HoverCardContent side="top" align="start" alignOffset={12}>
              <div className="flex flex-col items-start relative space-y-2">
                <div className="flex justify-between w-full items-center">
                  <span className="scale-95 p-2">
                    <Logo variant="typographic" />
                  </span>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="relative -right-3"
                    onClick={() =>
                      router.push("https://github.com/danarocha-br/jolly-code")
                    }
                  >
                    <i className="ri-github-fill text-xl" />
                  </Button>
                </div>
                <Separator className="bg-accent/50" />

                <div className={S.author()}>
                  <p>
                    with 💜 by{" "}
                    <Link
                      href="https://github.com/danarocha-br/jolly-code"
                      className="text-violet-300 transition-colors hover:text-violet-400"
                    >
                      Dana Rocha
                    </Link>
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>

        <div className={S.logo({ show: SIDEBAR_COLLAPSED_WIDTH === width })}>
          <Logo />
        </div>

        <div className="absolute bottom-6 right-2">
          <Tooltip content="Close sidebar">
            <Button size="icon" variant="ghost" onClick={closeSidebar}>
              <i className="ri-layout-right-2-line text-xl" />
            </Button>
          </Tooltip>
        </div>
      </motion.div>
    </aside>
  );
};
