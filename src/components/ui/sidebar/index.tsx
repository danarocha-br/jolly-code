import React, { useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

import * as S from "./styles";
import { Button } from "../button";
import { useUserSettingsStore } from "@/app/store";

export const Sidebar: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const initialWidth = 50;
  const [width, setWidth] = useState(initialWidth);
  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );

  const handleMouseMove = (event: React.MouseEvent) => {
    const newWidth = 280;
    setWidth(newWidth);
  };

  const handleMouseLeave = () => {
    setWidth(initialWidth);
  };

  return (
    <aside className="hidden lg:flex ">
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
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <i className="ri-moon-fill text-lg" />
          ) : (
            <i className="ri-sun-fill text-lg" />
          )}
        </Button>
        <div className={S.logo({ show: initialWidth === width })}>◖ ⬤ ◗ ☰</div>

        {/* <p className="mr-96 text-lg">𝐉𝐨ℓℓ𝐲𝐂𝐨𝐝𝐞</p> */}
        <div className={S.author({ show: initialWidth !== width })}>
          With 💜 by Dana Rocha
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
