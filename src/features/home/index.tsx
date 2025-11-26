"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";


import { cn } from "@/lib/utils";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { SettingsPanel } from "@/features/settings-panel";
import { UserTools } from "@/features/user-tools";
import { CodeEditor } from "@/features/code-editor";
import { useEditorStore, useUserStore } from "@/app/store";
import { analytics } from "@/lib/services/tracking";

export const Home = () => {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const shared = searchParams.get("shared");

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const isPresentational = useEditorStore((state) => state.presentational);

  const { isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const { data } = await supabase.auth.getUser();

        if (data?.user) {
          useUserStore.setState({
            user: data.user,
          });
        } else {
          useUserStore.setState({ user: null });
        }

        return data.user;
      } catch (error) {
        toast.error("Sorry, something went wrong.");
        useUserStore.setState({ user: null });
      }
    },
  });



  useEffect(() => {
    useEditorStore.setState({
      presentational: shared === "true" ? true : false,
      showBackground: shared === "true" ? false : true,
    });

    // Track shared URL view
    if (shared === "true") {
      analytics.track("view_shared_snippet");
    }
  }, [shared]);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

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

    const { activeEditorTabId, updateEditor, resetEditors } = useEditorStore.getState();

    if (codeParam) {
      try {
        // Reset editors to clear any persisted state for unauthenticated users
        resetEditors();

        // Get the new active tab ID after reset
        const newActiveTabId = useEditorStore.getState().activeEditorTabId;

        const decodedCode = atob(codeParam);
        updateEditor(newActiveTabId, {
          code: decodedCode,
          language: state.language || "plaintext",
          title: state.title || "Untitled",
        });
      } catch (e) {
        console.error("Failed to decode code param", e);
      }
    }

    useEditorStore.setState({
      padding: 28,
      fontSize: Number(15),
    });
  }, []);

  if (!hasMounted) {
    return null;
  }

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
            <CodeEditor isLoading={isLoading} />

            <SettingsPanel />

            <UserTools />
          </main>
        </div>
      </div>
    </>
  );
};
