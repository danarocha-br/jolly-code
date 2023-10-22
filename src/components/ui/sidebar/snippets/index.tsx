import React, { useRef } from "react";
import { toast } from "sonner";
import { useQuery } from "react-query";

import { languagesLogos } from "@/lib/language-logos";
import { Button } from "../../button";
import { ScrollArea } from "../../scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../accordion";
import { Skeleton } from "../../skeleton";
import * as S from "./styles";
import { EditorState, useEditorStore } from "@/app/store";

type Snippet = {
  id: string;
  user_id: string;
  code: string;
  language: string;
  title: string;
  url?: string | null | undefined;
  created_at?: string | undefined;
};

export const EmptyState = () => {
  return (
    <div className="w-full pr-5 mt-12">
      <div className={S.emptyContainer()}>
        <div className={S.emptyCard()}>
          <div className={S.emptyIcon()}>
            <i className="ri-bookmark-line" />
          </div>

          <div className="flex flex-col gap-2 mt-8 w-full">
            <div className={S.emptyLines()} />
            <div className={S.emptyLines()} />
          </div>
        </div>

        <h4 className="text-foreground/90">No saved snippets yet</h4>

        <p className={S.emptyDescription()}>
          Start by creating a folder or saving a code snippet.
        </p>

        <Button variant="secondary" className="w-[220px]">
          Create a folder
        </Button>
      </div>
    </div>
  );
};

export const SnippetsList = ({ data }: { data: Snippet[] }) => {
  const { setActiveTab, editors, activeEditorTabId, addEditor } =
    useEditorStore();
  const lastUpdateTime = useRef(0);

  const handleSnippetClick = (snippet: Snippet) => {
    const currentTime = Date.now();

    if (currentTime - lastUpdateTime.current > 500) {
      lastUpdateTime.current = currentTime;

      const isSnippetAlreadyInEditors = editors.some(
        (editor) => editor.id === snippet.id
      );

      if (!isSnippetAlreadyInEditors) {
        const newEditor: EditorState = {
          ...snippet,
          userHasEditedCode: true,
          autoDetectLanguage: true,
          editorShowLineNumbers: false,
          isSnippetSaved: true,
        };
        addEditor(newEditor);
      }

      setActiveTab(snippet.id);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pr-3">
      {/* <button className={S.addButton()}>
        <i className="ri-add-line text-lg" />
        Create folder
      </button> */}

      <Accordion type="multiple" defaultValue={["home"]} className="w-full">
        <AccordionItem value="home">
          <AccordionTrigger>
            <h2 className="text-foreground text-left text-sm w-full">
              <i className="ri-folder-line mr-3" />
              Home
            </h2>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="w-full grid grid-cols-1 gap-2">
              {data &&
                data.map((snippet: Snippet) => (
                  <li key={snippet.id}>
                    <button
                      className={S.snippet()}
                      onClick={() => handleSnippetClick(snippet)}
                    >
                      <div className="flex items-center gap-2 px-3 py-1">
                        <span className="scale-75 -ml-3">
                          {
                            languagesLogos[
                              snippet.language as keyof typeof languagesLogos
                            ]
                          }
                        </span>
                      </div>

                      <p className="flex-2 truncate">{snippet.title}</p>
                    </button>
                  </li>
                ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export const Snippets = () => {
  async function fetchSnippets() {
    try {
      const response = await fetch("/api/snippets", { method: "GET" });
      if (!response.ok) {
        toast.error("An error occurred. Please try again.");
      }
      const data = await response.json();

      if (!data) {
        toast.error("An error occurred. Please try again.");
      }

      return data;
    } catch (error) {
      console.error("Network error:", error);
      toast.error("An error occurred. Please try again.");
    }
  }

  const { isLoading, data } = useQuery("snippets", fetchSnippets);

  return (
    <section className="w-full pl-4">
      {isLoading ? (
        <div className="w-[calc(100%-16px)] flex flex-col p-8 justify-center items-center gap-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)] w-[calc(100%-16px)] mt-8 flex flex-col justify-center">
          <SnippetsList data={Array.isArray(data?.data) ? data.data : []} />
        </ScrollArea>
      )}
    </section>
  );
};
