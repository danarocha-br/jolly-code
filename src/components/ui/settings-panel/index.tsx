import React from "react";

import { ThemeSelector } from "./theme-selector";
import { LanguageSelector } from "./language-selector";
import { FontFamilySelector } from "./fontfamily-selector";
import { FontSizeSelector } from "./fontsize-selector";
import { PaddingSelector } from "./padding-selector";
import { BackgroundSwitch } from "./background-switch";
import { useUserSettingsStore } from "@/app/store";

import * as S from "./styles";
import { Button } from "../button";
import { useRouter } from "next/navigation";
import { codeSnippets } from "@/lib/code-snippets-options";

export const SettingsPanel = () => {
  const router = useRouter();
  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );

  const state = useUserSettingsStore();

  function sendUserToEditMode() {
    router.push("/");

    useUserSettingsStore.setState({
      ...state,
      code: codeSnippets[Math.floor(Math.random() * codeSnippets.length)].code,
      padding: 44,
      fontSize: Number(15),
    });
  }

  return (
    <footer className={S.footer()}>
      {isPresentational ? (
        <Button
          size="lg"
          variant="outline"
          onClick={() => sendUserToEditMode()}
        >
          Create my Snippet
        </Button>
      ) : (
        <>
          <ThemeSelector />

          <FontFamilySelector />

          <FontSizeSelector />

          <PaddingSelector />

          <BackgroundSwitch />

          <LanguageSelector />
        </>
      )}
    </footer>
  );
};
