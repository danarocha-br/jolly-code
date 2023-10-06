"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";

import { useUserSettingsStore } from "./store";
import { CodeEditor } from "@/components/ui/code-editor";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { SettingsPanel } from "@/components/ui/settings-panel";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { UserTools } from '@/components/user-tools';

export default function Home() {
  const supabase = createClientComponentClient();

  const searchParams = useSearchParams();

  const shared = searchParams.get("shared");

  const [hasMounted, setHasMounted] = useState(false);
  const backgroundTheme = useUserSettingsStore(
    (state) => state.backgroundTheme
  );
  const fontFamily = useUserSettingsStore((state) => state.fontFamily);
  const isPresentational = useUserSettingsStore(
    (state) => state.presentational
  );

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        useUserSettingsStore.setState({
          user: data.session.user,
        });
      }
    };

    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    if (queryParams.size === 0) {
      return;
    }

    const codeParam = queryParams.get("code");
    const encodedPattern = new RegExp("^[0-9a-zA-Z+/=]*$", "i"); // pattern for base64 encoded string

    const loggedInPattern = new RegExp(
      "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", // pattern for signing in
      "i"
    );

    if (codeParam && !encodedPattern.test(codeParam)) {
      return;
    }

    if (codeParam && loggedInPattern.test(codeParam)) {
      return;
    }

    const state = Object.fromEntries(queryParams);

    useUserSettingsStore.setState({
      ...state,
      code: state.code ? atob(state.code) : "",
      autoDetectLanguage: state.autoDetectLanguage === "true",
      padding: 28,
      fontSize: Number(15),
    });
  }, []);

  useLayoutEffect(() => {
    setHasMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (shared === "true") {
      useUserSettingsStore.setState({
        presentational: true,
        showBackground: false,
      });
    } else {
      useUserSettingsStore.setState({
        presentational: false,
        showBackground: true,
      });
    }
  }, [shared]);

  if (!hasMounted) {
    return null;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
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

      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.15.1/devicon.min.css"
      />

      <div
        className={cn(
          "min-h-screen",
          "flex",
          "flex-col",
          "lg:flex-row",
          "bg-background",
          [isPresentational && themes[backgroundTheme].background]
        )}
      >
        <Sidebar />

        <Nav />

        <div className="w-full min-h-screen grid items-center justify-center py-6 relative bottom-7 2xl:bottom-4">
          <main className="relative flex items-center justify-center lg:-ml-16">
            <CodeEditor />

            <SettingsPanel />

            <UserTools />
          </main>
        </div>
      </div>
    </Suspense>
  );
}
