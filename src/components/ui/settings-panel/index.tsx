import React, { useCallback } from "react";
import { useRouter } from "next/navigation";

import { ThemeSelector } from "./theme-selector";
import { LanguageSelector } from "./language-selector";
import { FontFamilySelector } from "./fontfamily-selector";
import { FontSizeSelector } from "./fontsize-selector";
import { PaddingSelector } from "./padding-selector";
import { BackgroundSwitch } from "./background-switch";
import { useUserSettingsStore } from "@/app/store";
import { Button } from "../button";

import * as S from "./styles";

export const SettingsPanel = () => {
  const router = useRouter();

  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );

  const state = useUserSettingsStore();

  const sendUserToEditMode = useCallback(() => {
    router.push("/");

    useUserSettingsStore.setState({
      ...state,
      padding: 44,
      fontSize: Number(15),
    });
  }, [router, state]);

  return isPresentational ? (
    <footer className={S.footerShared()}>
      <Button size="lg" variant="secondary" onClick={sendUserToEditMode}>
        <i className="ri-magic-fill text-lg mr-3" />
        Create my Snippet
      </Button>
    </footer>
  ) : (
    <footer className={S.footer()}>
      <ThemeSelector />

      <FontFamilySelector />

      <FontSizeSelector />

      <PaddingSelector />

      <BackgroundSwitch />

      <LanguageSelector />
    </footer>
  );
};
