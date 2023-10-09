import React, { useState } from "react";
import { Resizable } from "re-resizable";

import { Editor } from "./editor";
import { cn } from "@/lib/utils";
import { useUserSettingsStore } from "@/app/store";
import { resizableButton } from "./styles";

type CodeEditor = {
  isLoading: boolean;
};

export const CodeEditor = ({ isLoading }: CodeEditor) => {
  const [width, setWidth] = useState("auto");
  const padding = useUserSettingsStore((state) => state.padding);
  const [isWidthVisible, setIsWidthVisible] = useState(false);

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
    <>
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
        />
      </Resizable>
    </>
  );
};
