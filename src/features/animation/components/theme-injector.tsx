"use client";

import { useEditorStore } from "@/app/store";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";

export function ThemeInjector() {
  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);

  return (
    <>
      <link
        rel="stylesheet"
        href={themes[backgroundTheme].theme}
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href={fonts[fontFamily].src}
        crossOrigin="anonymous"
      />
    </>
  );
}
