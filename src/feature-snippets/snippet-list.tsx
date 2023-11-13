"use client";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EditorState, useEditorStore } from "@/app/store";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";

import {
  DialogChooseCollectionHandlesProps,
  DialogChooseCollection,
} from "./choose-collection-dialog";
import {
  fetchCollections,
  removeCollection,
  updateCollectionTitle,
} from "./db-helpers";
import { Collection, Snippet } from "./dtos";
import { CollectionItem } from "./ui/collection-item";
import { CollectionTrigger } from "./ui/collection-trigger";

export function SnippetsList({ data }: { data: Snippet[] }) {
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [collectionTitleEditable, setIsCollectionTitleEditable] =
    useState(false);
  const [collectionTitle, setCollectionTitle] = useState("");

  const collectionTitleInputRef = useRef<HTMLInputElement>(null);
  const lastUpdateTime = useRef(0);
  const moveToFolderDialog = useRef<DialogChooseCollectionHandlesProps>(null);

  const { setActiveTab, editors, addEditor } = useEditorStore();

  const queryClient = useQueryClient();

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

  const { mutate: handleDeleteCollection } = useMutation({
    mutationFn: removeCollection,
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Collection[] };

      queryClient.setQueryData(["collections"], previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const { mutate: handleUpdateCollection } = useMutation({
    mutationFn: updateCollectionTitle,
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Collection[] };

      queryClient.setQueryData(["collections"], previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  return (
    <>
      <div className="flex flex-col items-center justify-center ">
        <Accordion type="multiple" defaultValue={["home"]} className="w-full">
          <AccordionItem value="home">
            <CollectionTrigger>
              <>
                <i className="ri-folder-line mr-3" />
                Home
              </>
            </CollectionTrigger>

            <AccordionContent>
              <ul className="w-full grid grid-cols-1 gap-2">
                {data &&
                  data.map((snippet: Snippet) => (
                    <CollectionItem
                      key={snippet.id}
                      id={snippet.id}
                      title={snippet.title}
                      language={snippet.language}
                      onSnippetClick={() => handleSnippetClick(snippet)}
                      onMoveToFolder={() =>
                        handleOpenMoveToFolderDialog(snippet, "")
                      }
                    />
                  ))}
              </ul>
            </AccordionContent>
          </AccordionItem>

          {collections &&
            collections.data.map((collection: Collection) => (
              <AccordionItem key={collection.id} value={collection.id!}>
                <CollectionTrigger
                  onRemove={() =>
                    handleDeleteCollection({
                      collection_id: collection.id,
                      user_id: collection.user_id,
                    })
                  }
                  onUpdate={() => {
                    collectionTitleInputRef.current?.focus();
                    setCollectionTitle(collection.title);
                    setIsCollectionTitleEditable(true);
                  }}
                >
                  <>
                    <i className="ri-folder-line mr-3 " />
                    {collectionTitleEditable ? (
                      <input
                        ref={collectionTitleInputRef}
                        id="collection_title"
                        type="text"
                        onBlur={() => {
                          setIsCollectionTitleEditable(false);
                          handleUpdateCollection({
                            id: collection.id,
                            user_id: collection.user_id,
                            title: collectionTitle,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            collectionTitleInputRef.current?.blur();
                          }
                        }}
                        onChange={(e) => setCollectionTitle(e.target.value)}
                        value={collectionTitle}
                        className="bg-transparent border-2 border-secondary dark:border-border outline-none dark:focus:border-primary focus:border-indigo-200 rounded-sm p-px px-2 w-[80%]"
                      />
                    ) : (
                      collection.title
                    )}
                  </>
                </CollectionTrigger>

                <AccordionContent>
                  <ul className="w-full grid grid-cols-1 gap-2">
                    {collection.snippets?.length &&
                      collection.snippets.map((snippet: Snippet) => (
                        <CollectionItem
                          key={snippet.id}
                          id={snippet.id}
                          title={snippet.title}
                          language={snippet.language}
                          onSnippetClick={() => handleSnippetClick(snippet)}
                          onMoveToFolder={() =>
                            handleOpenMoveToFolderDialog(
                              snippet,
                              collection.id || ""
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

      {selectedSnippet && (
        <DialogChooseCollection
          ref={moveToFolderDialog}
          snippet={selectedSnippet}
          collection_id={selectedCollectionId}
        />
      )}
    </>
  );
}
