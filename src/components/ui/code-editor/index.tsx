import React, { useState } from "react";
import { Resizable } from "re-resizable";

import { cn } from "@/lib/utils";
import { EditorState, useEditorStore } from "@/app/store";
import { Editor } from "./editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { Button } from "../button";
import { resizableButton } from "./styles";
import { useMediaQuery } from "@/lib/utils/media-query";

type CodeEditor = {
  isLoading: boolean;
};

const ResizableHandle = ({ direction }: { direction: string }) => {
  return (
    <div
      className={cn(
        resizableButton(),
        direction === "right" ? "-right-4" : "-left-4"
      )}
    >
      <i className="ri-draggable text-md"></i>
    </div>
  );
};

export const CodeEditor = ({ isLoading }: CodeEditor) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [width, setWidth] = useState(isMobile ? "320px" : "720px");
  const [isWidthVisible, setIsWidthVisible] = useState(false);

  const [activeTab, setActiveTab] = useState("1");
  const tabs = useEditorStore((state) => state.editors);
  const padding = useEditorStore((state) => state.padding);
  const removeEditor = useEditorStore((state) => state.removeEditor);

  function handleAddTabs() {
    const newTabId = `editor${tabs.length + 1}`;

    useEditorStore.setState((oldState) => {
      const newTab: EditorState = {
        id: newTabId,
        code: "",
        title: `Untitled ${tabs.length + 1}`,
        language: "plaintext",
        autoDetectLanguage: false,
        userHasEditedCode: false,
        editorShowLineNumbers: false,
        isSnippetSaved: false,
      };

      return { ...oldState, editors: [...oldState.editors, newTab] };
    });

    setActiveTab(newTabId);
  }

  function handleRemoveTab() {
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);
    removeEditor(activeTab);

    const newActiveTab =
      activeTabIndex === 0 ? tabs[1].id : tabs[activeTabIndex - 1].id;
    setActiveTab(newActiveTab);
  }

  return (
    <Tabs
      defaultValue="1"
      value={activeTab}
      onValueChange={(tab) => {
        useEditorStore.setState(() => ({
          currentEditorTab: tab,
        }));
        setActiveTab(tab);
      }}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="relative capitalize group/tab"
          >
            {tab.title}
            {tabs.length > 1 && (
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
        <Button
          variant="secondary"
          size="icon"
          className="ml-2 bg-foreground/[0.02]"
          onClick={handleAddTabs}
        >
          <i className="ri-add-line text-lg" />
        </Button>
      </TabsList>

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
              padding={padding}
              width={width}
              setWidth={setWidth}
              isWidthVisible={isWidthVisible}
              isLoading={isLoading}
              activeTab={activeTab}
            />
          </Resizable>
        </TabsContent>
      ))}
    </Tabs>
  );
};
