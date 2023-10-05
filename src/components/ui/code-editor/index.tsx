import React, { useState } from "react";
import { Resizable } from "re-resizable";

import { Editor } from "./editor";
import { cn } from "@/lib/utils";
import { useUserSettingsStore } from "@/app/store";
import { Button } from "../button";
import { Tooltip } from "../tooltip";
import { bookmarkButton, resizableButton } from "./styles";

export const CodeEditor = () => {
  const [width, setWidth] = useState("auto");
  const padding = useUserSettingsStore((state) => state.padding);
  const [showWidth, setShowWidth] = useState(false);

  const ResizableHandleRight = () => {
    return (
      <div className={cn(resizableButton(), "-right-4")}>
        <i className="ri-draggable text-md"></i>
      </div>
    );
  };
  const ResizableHandleLeft = () => {
    return (
      <div className={cn(resizableButton(), "-left-4")}>
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
        onResizeStart={() => setShowWidth(true)}
        onResizeStop={() => setShowWidth(false)}
        size={{ width, height: "auto" }}
        handleComponent={{
          right: <ResizableHandleRight />,
          left: <ResizableHandleLeft />,
        }}
        className={cn("group/editor hidden lg:block relative")}
      >
        <Tooltip content="Save snippet">
          <Button size="icon" variant="ghost" className={bookmarkButton()}>
            <i className="ri-bookmark-line" />
          </Button>
        </Tooltip>

        <Editor
          padding={padding}
          width={width}
          setWidth={setWidth}
          showWidth={showWidth}
        />
      </Resizable>

      <div className="block lg:hidden px-4">
        <Editor
          padding={padding}
          width={width}
          setWidth={setWidth}
          showWidth={showWidth}
        />
      </div>
    </>
  );
};
