import React from "react";
import { toast } from "sonner";
import { useQuery } from "react-query";

import { Button } from "../../button";
import * as S from "./styles";
import { Separator } from "../../separator";
import { languagesLogos } from "@/lib/language-logos";
import { ScrollArea } from "../../scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../accordion";

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
    <div className="w-full px-4 mt-12">
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
  return (
    <div className="flex flex-col items-center justify-center px-3">
      <button className={S.addButton()}>
        <i className="ri-add-line text-lg" />
        Create folder
      </button>

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
                    <button className={S.snippet()}>
                      <div className="flex items-center gap-2 px-3 py-1">
                        <span className="scale-75 -ml-3">
                          {
                            languagesLogos[
                              snippet.language as keyof typeof languagesLogos
                            ]
                          }
                        </span>
                      </div>

                      <p className="flex-2">{snippet.title}</p>
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
        <div className="flex justify-center items-center h-64">
          {/* <Spinner /> */}
        </div>
      ) : !data ? (
        <EmptyState />
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)] w-[calc(100%-16px)] mt-8 flex flex-col justify-center">
          <SnippetsList data={Array.isArray(data?.data) ? data.data : []} />
        </ScrollArea>
      )}
    </section>
  );
};
