"use client";
import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EditorState, useEditorStore } from "@/app/store";
import {
  Accordion,
  AccordionItem,
  AccordionContent,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

import {
  DialogChooseCollectionHandlesProps,
  DialogChooseCollection,
} from "./choose-collection-dialog";
import {
  removeCollection,
  removeSnippet,
  updateCollectionTitle,
} from "./db-helpers";
import { Collection, Snippet } from "./dtos";
import { CollectionItem } from "./ui/collection-item";
import { CollectionTrigger } from "./ui/collection-trigger";

type SnippetsListProps = {
  collections: Collection[] | [];
  isRefetching: boolean;
};

export function SnippetsList({ collections, isRefetching }: SnippetsListProps) {
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [previousCollectionId, setPreviousCollectionId] = useState<string>("");
  const [collectionTitleEditable, setIsCollectionTitleEditable] =
    useState(false);
  const [collectionTitle, setCollectionTitle] = useState("");

  const collectionTitleInputRef = useRef<HTMLInputElement>(null);
  const lastUpdateTime = useRef(0);
  const moveToFolderDialog = useRef<DialogChooseCollectionHandlesProps>(null);

  const { setActiveTab, editors, addEditor } = useEditorStore();

  const queryClient = useQueryClient();
  const queryKey = ["collections"];

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

  const handleOpenMoveToFolderDialog = useCallback(
    (snippet: Snippet, previous_collection_id: string) => {
      setPreviousCollectionId(previous_collection_id);
      setSelectedSnippet(snippet);

      moveToFolderDialog && moveToFolderDialog.current?.openDialog();
    },
    []
  );

  const { mutate: handleDeleteCollection } = useMutation({
    mutationFn: removeCollection,
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Collection[] };

      queryClient.setQueryData(queryKey, previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const { mutate: handleUpdateCollection } = useMutation({
    mutationFn: updateCollectionTitle,

    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Collection[] };

      queryClient.setQueryData(queryKey, previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const { mutate: handleDeleteSnippet } = useMutation({
    mutationFn: removeSnippet,
    onError: (err, variables, context) => {
      const { previousState } = context as { previousState: Snippet };

      queryClient.setQueryData(queryKey, previousState);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return (
    <>
      {collections && (
        <div className="flex flex-col items-center justify-center">
          <Accordion
            type="multiple"
            defaultValue={
              collections && collections.length > 0 ? [collections[0].id] : []
            }
            className="w-full"
          >
            {collections && !isRefetching ? (
              collections.map((collection: Collection, index: number) => (
                <AccordionItem key={collection.id} value={collection.id}>
                  <CollectionTrigger
                    title={collection.title}
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
                            if (e.key === "Escape") {
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
                      {collection.snippets?.length
                        ? collection.snippets.map((snippet_id) => (
                            <CollectionItem
                              key={snippet_id}
                              id={snippet_id}
                              collectionId={collection.id}
                              onItemSelect={handleSnippetClick}
                              onDelete={handleDeleteSnippet}
                              onMoveToCollection={handleOpenMoveToFolderDialog}
                            />
                          ))
                        : null}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))
            ) : (
              <div className="w-full flex flex-col gap-3">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            )}
          </Accordion>
        </div>
      )}

      {selectedSnippet && (
        <DialogChooseCollection
          ref={moveToFolderDialog}
          snippet={selectedSnippet}
          previousCollectionId={previousCollectionId}
        />
      )}
    </>
  );
}
