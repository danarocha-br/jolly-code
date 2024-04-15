"use client";

import { Suspense, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Hotjar from "@hotjar/browser";

import { cn } from "@/lib/utils";
import { themes } from "@/lib/themes-options";
import { fonts } from "@/lib/fonts-options";
import { Nav } from "@/components/ui/nav";
import { Sidebar } from "@/components/ui/sidebar";
import { Logo } from "@/components/ui/logo";
import { SettingsPanel } from "@/feature-settings-panel";
import { UserTools } from "@/feature-user-tools";
import { CodeEditor } from "@/feature-code-editor";
import { useEditorStore, useUserStore } from "@/app/store";

export const Home = () => {
  const supabase = createClientComponentClient<Database>();
  const searchParams = useSearchParams();
  const shared = searchParams.get("shared");

  const backgroundTheme = useEditorStore((state) => state.backgroundTheme);
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const isPresentational = useEditorStore((state) => state.presentational);

  const { isLoading } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (data?.session) {
          useUserStore.setState({
            user: data.session.user,
          });
        }

        return data.session?.user;
      } catch (error) {
        toast.error("Sorry, something went wrong.");
      }
    },
  });

  useEffect(() => {
    const siteId = Number(process.env.NEXT_PUBLIC_HOTJAR_SITE_ID);
    const hotjarVersion = 6;

    Hotjar.init(siteId, hotjarVersion);
  }, []);

  useEffect(() => {
    useEditorStore.setState({
      presentational: shared === "true" ? true : false,
      showBackground: shared === "true" ? false : true,
    });
  }, [shared]);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
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

    useEditorStore.setState({
      ...state,
      padding: 28,
      fontSize: Number(15),
    });
  }, []);

  if (!hasMounted) {
    return null;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex justify-center items-center">
          <Logo
            variant="short"
            className="animate-pulse grayscale duration-[0.75s]"
          />
        </div>
      }
    >
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
    </Suspense>
  );
};
