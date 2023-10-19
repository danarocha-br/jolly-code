import React, { useCallback, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import Link from "next/link";

import * as S from "./styles";
import { Button } from "../button";
import { Logo } from "../logo";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../hover-card";
import { Separator } from "../separator";
import { Snippets } from "./snippets";
import { useUserSettingsStore } from "@/app/store";

const themeMapping: { [key in "dark" | "light"]: "dark" | "light" } = {
  dark: "light",
  light: "dark",
};

const initialWidth = 50;

/**
 * Generates a custom hook that handles mouse events for the sidebar.
 *
 * @return {Object} An object containing the following properties:
 *   - width: The current width of the sidebar.
 *   - handleMouseMove: A callback function to handle mouse move events.
 *   - handleMouseLeave: A callback function to handle mouse leave events.
 */
const useSidebarMouseEvents = () => {
  const [width, setWidth] = useState(initialWidth);

  const handleMouseMove = useCallback(() => {
    const newWidth = 280;
    setWidth(newWidth);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setWidth(initialWidth);
  }, []);

  return { width, handleMouseMove, handleMouseLeave };
};

export const Sidebar = () => {
  const { theme, setTheme } = useTheme();
  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );
  const { width, handleMouseMove, handleMouseLeave } = useSidebarMouseEvents();
  const memoizedTheme = useMemo(() => theme, [theme]);
  const showSidebarContent = useMemo(() => initialWidth !== width, [width]);

  return (
    <aside className="hidden lg:flex">
      <motion.div
        className={S.container({
          isPresentational,
        })}
        animate={{ width }}
        transition={{ ease: "easeOut", duration: 0.3 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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

        <h2 className={S.title({ show: showSidebarContent })}>My Snippets</h2>

        <Snippets show={showSidebarContent} />

        <div className="absolute bottom-3 left-2">
          <HoverCard openDelay={0}>
            <HoverCardTrigger>
              <div className={S.logoShort({ show: showSidebarContent })}>
                <Logo variant="short" />
              </div>
            </HoverCardTrigger>

            <HoverCardContent side="top" align="start" alignOffset={12}>
              <div className="flex flex-col items-start relative space-y-2">
                <div className="flex justify-between items-center">
                  <span className="scale-95 p-2">
                    <Logo variant="typographic" />
                  </span>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="relative -right-3"
                  >
                    <i className="ri-github-fill text-xl" />
                  </Button>
                </div>
                <Separator className="bg-accent/50" />

                <div className={S.author()}>
                  <p>
                    with 💜 by{" "}
                    <Link
                      href="https://bento.me/danarocha"
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

        <div className={S.logo({ show: initialWidth === width })}>
          <Logo />
        </div>

        <div className="absolute bottom-6 right-2">
          <Button size="icon" variant="ghost">
            <i className="ri-layout-right-2-line text-xl" />
          </Button>
        </div>
      </motion.div>
    </aside>
  );
};
