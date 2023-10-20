import React, { useState } from "react";
import { Resizable } from "re-resizable";

import { Editor } from "./editor";
import { cn } from "@/lib/utils";
import { EditorStoreState, useEditorStore } from "@/app/store";
import { resizableButton } from "./styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../tabs";
import { Button } from "../button";

type CodeEditor = {
  isLoading: boolean;
};

// Define a function to initialize the state for each tab
const initializeState = (): EditorStoreState => ({
  code: "",
  // other initial state values...
});

export const CodeEditor = ({ isLoading }: CodeEditor) => {
  const [width, setWidth] = useState("auto");
  const padding = useEditorStore((state) => state.padding);
  const [isWidthVisible, setIsWidthVisible] = useState(false);
  const [tabs, setTabs] = useState(["editor"]);

const handleAddTabs = () => {
  setTabs([
    ...tabs,
    {
      id: `editor${tabs.length + 1}`,
      store: create<StoreState>(initializeState),
    },
  ]); // Add new tab
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

  return (
    <Tabs defaultValue="editor">
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="relative capitalize">
            {tab}
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
        {/* <TabsTrigger value="editor" className="relative">
        </TabsTrigger> */}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-2">
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
              store={tab.store}
            />
          </Resizable>
        </TabsContent>
      ))}
    </Tabs>
  );
};
