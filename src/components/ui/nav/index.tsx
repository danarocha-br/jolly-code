import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation } from "react-query";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

import { Button } from "../button";
import { ExportMenu } from "./export-menu";
import { hotKeyList } from "@/lib/hot-key-list";
import { useEditorStore, useUserStore } from "@/app/store";
import { CopyURLToClipboard } from "./copy-url-to-clipboard";
import UsersPresence from "./users-presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Avatar } from "../avatar";
import { LoginDialog } from "@/app/auth/login";

export const Nav = () => {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isPresentational = useEditorStore(
    (state) => state.presentational
  );
  const { user } = useUserStore();
  const username = useMemo(() => user?.user_metadata?.full_name, [user]);
  const imageUrl = useMemo(() => user?.user_metadata?.avatar_url, [user]);

  /**
   * Handles the toggle theme functionality.
   *
   * @return {void} No return value.
   */
  function handleToggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const handleSignOut = useMutation(
    async () => {
      await supabase.auth.signOut();
      useUserStore.setState({ user: null });
    },
    {
      onSuccess: () => {
        toast.message("👋 See you soon!");
        router.refresh();
      },
      onError: () => {
        toast.error("Sorry, something went wrong.");
      },
    }
  );

  const toggleTheme = useMemo(
    () => hotKeyList.filter((item) => item.label === "Toggle theme"),
    []
  );

  useHotkeys(toggleTheme[0].hotKey, () => handleToggleTheme());

  return (
    <nav className="fixed top-0 flex items-center justify-between gap-2 px-3 lg:px-4 py-3 z-50 w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="lg:hidden mr-auto"
            onClick={() => handleToggleTheme()}
          >
            <i className="ri-menu-fill text-lg" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" alignOffset={2}>
          <DropdownMenuItem asChild>
            {!!user && username ? (
              <div>
                <div className="flex items-center gap-2">
                  <Avatar
                    username={username}
                    imageSrc={imageUrl}
                    alt={username}
                  />
                  {username}
                </div>
              </div>
            ) : (
              <LoginDialog>
                <button className="flex items-center gap-2 text-sm p-2">
                  <svg
                    width="23"
                    height="23"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-foreground scale-[0.75]"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M11.452 0h.048c6.307.052 11.404 5.18 11.404 11.5S17.807 22.948 11.5 23h-.096C5.097 22.948 0 17.82 0 11.5S5.097.052 11.404 0h.048Zm.048 6.726v9.765h.013a4.882 4.882 0 0 0 0-9.765H11.5Z"
                    />
                  </svg>
                  Login with Github
                </button>
              </LoginDialog>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => handleToggleTheme()}>
            <div className="flex items-center">
              {theme === "dark" ? (
                <>
                  <i className="ri-moon-fill text-lg mr-3" />
                  Toggle Light Mode
                </>
              ) : (
                <>
                  <i className="ri-sun-fill text-lg mr-3" />
                  Toggle Dark Mode
                </>
              )}
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {!!user && (
            <DropdownMenuItem onClick={() => handleSignOut.mutate()}>
              <div className="flex items-center">
                <i className="ri-logout-circle-fill text-lg mr-3" />
                Logout
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center justify-end py-2 lg:pt-3 lg:pr-3 w-full gap-2">
        {isPresentational && <UsersPresence />}

        <ExportMenu />

        <CopyURLToClipboard />
      </div>
    </nav>
  );
};
