import React, { useMemo, useState } from "react";
import { Resizable } from "re-resizable";

import { cn } from "@/lib/utils";
import { useEditorStore } from "@/app/store";
import { useMediaQuery } from "@/lib/utils/media-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area/index";
import { Editor } from "./editor";
import { ResizableHandle } from "./resizable-handle";

type CodeEditor = {
  isLoading: boolean;
};

export const CodeEditor = ({ isLoading }: CodeEditor) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [width, setWidth] = useState(isMobile ? "320px" : "720px");
  const [isWidthVisible, setIsWidthVisible] = useState(false);

  const editorStore = useEditorStore((state) => state.editors);
  const activeEditorTabId = useEditorStore((state) => state.activeEditorTabId);
  const padding = useEditorStore((state) => state.padding);
  const { createNewTab, removeEditor, setActiveTab } = useEditorStore();

  const presentational = useEditorStore((state) => state.presentational);

  const tabs = useMemo(() => {
    return Array.isArray(editorStore) ? editorStore : [];
  }, [editorStore]);

  const currentActiveEditor = useMemo(() => {
    return tabs.find((t) => t.id === activeEditorTabId) || null;
  }, [activeEditorTabId, tabs]);

  /**
   * Handles the action of adding tabs.
   */
  function handleAddTabs() {
    const newTabId = createNewTab();
    setActiveTab(newTabId);
  }

  /**
   * Removes the active tab from the editor and updates the active tab accordingly.
   */
  function handleRemoveTab() {
    const currentEditors = useEditorStore.getState().editors;
    const activeEditorTabId = useEditorStore.getState().activeEditorTabId;

    // Find the index of the current active tab
    const activeTabIndex = currentEditors.findIndex(
      (editor) => editor.id === activeEditorTabId
    );

    removeEditor(activeEditorTabId);

    // If there are still tabs left after removing one
    if (currentEditors.length > 1) {
      // If the active tab was the first one, set the new active tab to the first one in the updated list
      if (activeTabIndex === 0) {
        const newActiveTabId = currentEditors[1].id;
        setActiveTab(newActiveTabId);
      }
      // Otherwise, set the new active tab to the one before the removed tab
      else {
        const newActiveTabId = currentEditors[activeTabIndex - 1].id;
        setActiveTab(newActiveTabId);
      }
    }
  }

  return (
    <Tabs
      defaultValue={editorStore.length > 0 ? editorStore[0].id : ""}
      value={activeEditorTabId}
      onValueChange={(tab) => setActiveTab(tab)}
    >
      <Resizable
        className="overflow-hidden"
        minWidth={padding * 2 + 320}
        maxWidth="90vw"
        size={{ width, height: "auto" }}
      >
        <ScrollArea className="overflow-hidden">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="relative capitalize group/tab max-w-[180px]"
              >
                <div className="truncate">
                  {tab.isSnippetSaved && (
                    <i className="ri-bookmark-fill mr-2" />
                  )}
                  {tab.title}
                </div>

                {tabs.length > 1 && !presentational && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2.5 ml-px transition-opacity opacity-0 group-hover/tab:opacity-100 !w-4 !h-4"
                    onClick={handleRemoveTab}
                  >
                    <i className="ri-close-line" />
                  </Button>
                )}
              </TabsTrigger>
            ))}

            {!presentational && (
              <Button
                variant="secondary"
                size="icon"
                className="ml-2 bg-foreground/[0.02]"
                onClick={handleAddTabs}
              >
                <i className="ri-add-line text-lg" />
              </Button>
            )}
          </TabsList>

          <ScrollBar
            orientation="horizontal"
            className="[.scroll-thumb]:bg-transparent"
          />
        </ScrollArea>
      </Resizable>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-2">
          <Resizable
            enable={{ left: true, right: true }}
            minWidth={padding * 2 + 320}
            maxWidth="90vw"
            onResize={(e, dir, ref) => setWidth(ref.offsetWidth.toString())}
            onResizeStart={() => setIsWidthVisible(true)}
            onResizeStop={() => setIsWidthVisible(false)}
            size={{ width, height: "auto" }}
            handleComponent={{
              right: <ResizableHandle direction="right" />,
              left: <ResizableHandle direction="left" />,
            }}
            className={cn("group/editor relative")}
          >
            <Editor
              editors={tabs}
              currentEditor={currentActiveEditor}
              padding={padding}
              width={width}
              setWidth={setWidth}
              isWidthVisible={isWidthVisible}
              isLoading={isLoading}
            />
          </Resizable>
        </TabsContent>
      ))}
    </Tabs>
  );
};
