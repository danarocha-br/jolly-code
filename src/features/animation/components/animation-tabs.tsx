"use client";
import { User } from "@supabase/supabase-js";
import { useCallback } from "react";

import { useAnimationStore, useEditorStore } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackAnimationEvent } from "@/features/animation/analytics";

type AnimationTabsProps = {
  user: User | null;
  activeTabId: string | undefined;
  setActiveTabId: (id: string) => void;
};

export function AnimationTabs({ user, activeTabId, setActiveTabId }: AnimationTabsProps) {
  const tabs = useAnimationStore((state) => state.tabs);
  const createNewAnimation = useAnimationStore((state) => state.createNewAnimation);
  const closeTab = useAnimationStore((state) => state.closeTab);
  const presentational = useEditorStore((state) => state.presentational);

  const tabsValue = activeTabId ?? tabs[0]?.id ?? "";

  const handleTabChange = useCallback(
    (nextTabId: string) => {
      if (nextTabId === activeTabId) return;
      trackAnimationEvent("animation_tab_switched", user, {
        from_tab_id: activeTabId,
        to_tab_id: nextTabId,
        tab_count: tabs.length,
      });
      setActiveTabId(nextTabId);
    },
    [activeTabId, setActiveTabId, tabs.length, user]
  );

  const handleCreateNewAnimationTab = useCallback(() => {
    createNewAnimation();
    trackAnimationEvent("animation_tab_created", user, {
      tab_count: tabs.length + 1,
    });
  }, [createNewAnimation, tabs.length, user]);

  const handleRemoveTab = useCallback(
    (tabId: string) => {
      if (tabs.length <= 1) return;
      const targetTab = tabs.find((tab) => tab.id === tabId);
      trackAnimationEvent("animation_tab_closed", user, {
        tab_count_after: tabs.length - 1,
        was_saved: targetTab?.saved ?? false,
      });
      closeTab(tabId);
    },
    [closeTab, tabs, user]
  );

  return (
    <div className="w-full flex items-center gap-2">
      <div className="-ml-1 flex-1 min-w-0 overflow-hidden">
        <Tabs value={tabsValue} onValueChange={handleTabChange} className="w-full">
          <TabsList
            className="bg-transparent px-2 py-0 text-foreground w-full overflow-x-auto flex-nowrap gap-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent justify-start"
            style={{ scrollPaddingLeft: 12, scrollPaddingRight: 12 }}
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative group/tab max-w-[220px] whitespace-nowrap capitalize data-[state=active]:bg-foreground/[0.08] data-[state=active]:text-foreground text-foreground/70 hover:text-foreground"
              >
                <span className="truncate flex items-center gap-2">
                  {tab.saved ? <i className="ri-bookmark-fill" /> : null}
                  {tab.title}
                </span>
                {tabs.length > 1 && !presentational ? (
                  <span
                    role="button"
                    className="-mr-2.5 ml-1 transition-opacity opacity-0 group-hover/tab:opacity-100 inline-flex items-center justify-center w-4 h-4 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTab(tab.id);
                    }}
                  >
                    <i className="ri-close-line" />
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Button
        variant="secondary"
        size="icon"
        className="bg-foreground/[0.02] shrink-0"
        onClick={handleCreateNewAnimationTab}
      >
        <i className="ri-add-line text-lg" />
      </Button>
    </div>
  );
}
