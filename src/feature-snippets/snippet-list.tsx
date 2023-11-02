"use client";
import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EditorState, useEditorStore } from "@/app/store";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DialogChooseCollectionHandlesProps } from "./choose-collection-dialog";
import { fetchCollections } from "./db-helpers";
import { Collection, Snippet } from "./dtos";
import { CollectionItem } from "./ui/collection-item";

export function SnippetsList({ data }: { data: Snippet[] }) {
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const lastUpdateTime = useRef(0);
  const moveToFolderDialog = useRef<DialogChooseCollectionHandlesProps>(null);

  const { setActiveTab, editors, addEditor } = useEditorStore();

  const handleOpenMoveToFolderDialog = useCallback(
    (snippet: Snippet, collection_id: string) => {
      setSelectedSnippet(snippet);
      setSelectedCollectionId(collection_id);

      moveToFolderDialog && moveToFolderDialog.current?.openDialog();
    },
    []
  );

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

  const { data: collections } = useQuery(["collections"], fetchCollections);
  // console.log(collections)

  return (
    <>
      <div className="flex flex-col items-center justify-center pr-3">
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
                    <CollectionItem
                      key={snippet.id}
                      title={snippet.title}
                      language={snippet.language}
                      onSnippetClick={() => handleSnippetClick(snippet)}
                    />
                  ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {collections &&
            collections.data.map((collection: Collection) => (
              <AccordionItem key={collection.id} value={collection.id!}>
                <AccordionTrigger>
                  <h2 className="text-foreground text-left capitalize text-sm w-full">
                    <i className="ri-folder-line mr-3" />
                    {collection.title}
                  </h2>
                </AccordionTrigger>

                <AccordionContent>
                  <ul className="w-full grid grid-cols-1 gap-2">
                    {collection.snippets?.length &&
                      collection.snippets.map((snippet: Snippet) => (
                        <CollectionItem
                          key={snippet.id}
                          title={snippet.title}
                          language={snippet.language}
                          onSnippetClick={() => handleSnippetClick(snippet)}
                          onMoveToFolder={() =>
                            handleOpenMoveToFolderDialog(
                              snippet,
                              collection.id!
                            )
                          }
                        />
                      ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </div>

      {/* <DialogChooseCollection
        ref={moveToFolderDialog}
        snippet={selectedSnippet || defaultSnippet}
        collection_id={selectedCollectionId}
      /> */}
    </>
  );
}
