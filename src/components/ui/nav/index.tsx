"use client";

import { useMemo, useCallback, memo } from "react";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

import { Button } from "../button";
import { hotKeyList } from "@/lib/hot-key-list";
import { useEditorStore, useUserStore } from "@/app/store";
import UsersPresence from "./users-presence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { Avatar } from "../avatar";
import { LoginDialog } from "@/features/login";
import { CopyURLToClipboard } from "@/features/share-code";
import { ExportMenu } from "@/features/export/export-menu";
import { EnhancedAnimationShareDialog } from "@/features/animation/enhanced-share-dialog";
import { AnimationDownloadMenu } from "@/features/animation/animation-download-menu";
import { Tooltip } from "@/components/ui/tooltip";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "../navigation-menu";
import { cn } from "@/lib/utils";
import { useAnimationFeatureFlag } from "@/features/animation/hooks/use-animation-feature-flag";
import { Skeleton } from "../skeleton";
import { useUserUsage } from "@/features/user/queries";
import { getMaxUsagePercentage, getUsageThreshold } from "@/lib/utils/usage-helpers";

const TOGGLE_THEME_HOTKEY = hotKeyList.find((item) => item.label === "Toggle theme")?.hotKey ?? "";

const UserSection = memo(({ user, username, imageUrl }: {
  user: User | null;
  username: string | undefined;
  imageUrl: string | undefined;
}) => {
  if (user && username) {
    return (
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
    );
  }

  return (
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
  );
});

UserSection.displayName = "UserSection";

const ThemeToggleButton = memo(({ theme, onToggle }: {
  theme: string | undefined;
  onToggle: () => void;
}) => (
  <DropdownMenuItem onClick={onToggle}>
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
));

ThemeToggleButton.displayName = "ThemeToggleButton";

type NavProps = Record<string, never>;

export const Nav = () => {
  // Optimize Supabase client - only create once
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isEnabled: isAnimationFlagEnabled, isLoading: isAnimationFlagLoading } = useAnimationFeatureFlag({
    initialValue: pathname?.startsWith("/animate"),
  });

  // Optimize Zustand selectors - only subscribe to needed values
  const isPresentational = useEditorStore((state) => state.presentational);
  const user = useUserStore((state) => state.user);
  const { data: usage } = useUserUsage(user?.id);

  const username = user?.user_metadata?.full_name;
  const imageUrl = user?.user_metadata?.avatar_url;

  // Calculate usage for nav highlighting - only for non-pro plans
  // Early return optimization: don't calculate if pro plan or no usage
  const shouldShowUsageIndicator = Boolean(usage && usage.plan !== "pro");
  const maxUsagePercentage = useMemo(
    () => (shouldShowUsageIndicator && usage ? getMaxUsagePercentage(usage) : 0),
    [shouldShowUsageIndicator, usage]
  );
  const usageThreshold = useMemo(
    () => (shouldShowUsageIndicator ? getUsageThreshold(maxUsagePercentage) : null),
    [shouldShowUsageIndicator, maxUsagePercentage]
  );
  const navItems = useMemo(
    () => [
      { href: "/", label: "Code editor", enabled: true, loading: false },
      {
        href: "/animate",
        label: "Code animation",
        enabled: isAnimationFlagEnabled,
        loading: isAnimationFlagLoading,
      },
    ],
    [isAnimationFlagEnabled, isAnimationFlagLoading]
  );

  /**
   * Handles the toggle theme functionality.
   * Using useCallback for stable reference across renders.
   */
  const handleToggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const handleSignOut = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
      useUserStore.setState({ user: null });
    },
    onSuccess: () => {
      toast.message("👋 See you soon!");
      router.refresh();
    },
    onError: () => {
      toast.error("Sorry, something went wrong.");
    },
  });

  useHotkeys(TOGGLE_THEME_HOTKEY, handleToggleTheme);

  const isAnimationPage = pathname?.startsWith("/animate");

  return (
    <header className="w-full fixed top-0 right-0 flex items-center justify-between gap-2 px-3 lg:px-4 py-3 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="lg:hidden mr-auto"
            onClick={handleToggleTheme}
          >
            <i className="ri-menu-fill text-lg" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" alignOffset={2}>
          <DropdownMenuItem asChild>
            <UserSection user={user} username={username} imageUrl={imageUrl} />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <ThemeToggleButton theme={theme} onToggle={handleToggleTheme} />

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

      <div className="hidden lg:absolute left-1/2 -translate-x-1/2 top-5 lg:flex justify-center z-[999]">
        {!isPresentational && (
          <NavigationMenu>
            <NavigationMenuList className="gap-4">
              {navItems.map(({ href, label, enabled, loading }) => {
                if (loading) {
                  return (
                    <NavigationMenuItem key={href}>
                      <Skeleton className="h-9 w-[148px]" />
                    </NavigationMenuItem>
                  );
                }

                if (!enabled) return null;

                const isActive =
                  (href === "/" && pathname === "/") ||
                  (href !== "/" && pathname?.startsWith(href));
                return (
                  <NavigationMenuItem key={href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center opacity-30 px-4 py-2 rounded-xl text-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none focus-visible:outline-1",
                          isActive && "bg-subdued dark:bg-accent/40 text-accent-foreground opacity-100"
                        )}
                      >
                        <span>{label}</span>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
        )}
      </div>

      <div className="flex items-center justify-end py-2 lg:pt-3 lg:pr-3 w-full gap-2">
        {shouldShowUsageIndicator && usageThreshold && (
          <Tooltip content={`Usage: ${Math.round(maxUsagePercentage)}%`}>
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                usageThreshold.level === "limit" && "bg-destructive/20 text-destructive border border-destructive/30",
                usageThreshold.level === "critical" && "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30",
                usageThreshold.level === "warning" && "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
              )}
            >
              <span className="font-semibold">{Math.round(maxUsagePercentage)}%</span>
              {usageThreshold.level === "limit" && (
                <i className="ri-error-warning-line text-sm" />
              )}
              {(usageThreshold.level === "critical" || usageThreshold.level === "warning") && (
                <i className="ri-alert-line text-sm" />
              )}
            </div>
          </Tooltip>
        )}

        {isPresentational && <UsersPresence />}

        {!isPresentational &&
          (isAnimationPage ? (
            <>
              <AnimationDownloadMenu />
              <EnhancedAnimationShareDialog />
            </>
          ) : (
            <>
              <ExportMenu />
              <CopyURLToClipboard />
            </>
          ))}

        <Tooltip content="GitHub repository">
          <Button
            asChild
            className="hidden md:flex"
            size="icon"
            variant="ghost"
          >
            <a
              href="https://github.com/danarocha-br/jolly-code"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ri-github-fill text-xl" />
            </a>
          </Button>
        </Tooltip>
      </div>
    </header>
  );
};
