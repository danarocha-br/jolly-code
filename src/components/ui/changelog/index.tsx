import React from "react";
import { useQuery } from "react-query";
import { toast } from "sonner";
import dayjs from "dayjs";
import ReactMarkdown from "react-markdown";

import * as S from "./styles";
import { Separator } from "../separator";
import { Badge } from "../badge";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

type ChangeLog = {
  id: string;
  title: string;
  publishedAt: Date;
  markdownDetails: string;
  types: string[];
};

type ChangelogProps = {
  children: React.ReactNode;
};

export const Changelog = ({ children }: ChangelogProps) => {
  const { isLoading, data } = useQuery("changelogs", fetchData);

  async function fetchData() {
    try {
      const response = await fetch("/api/changelog", { method: "POST" });
      if (!response.ok) {
        toast.error("An error occurred.");
      }
      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Network error:", error);
      toast.error("An error occurred.");
    }
  }

  return (
    <Popover>
      <PopoverTrigger>{children}</PopoverTrigger>

      <PopoverContent>
        <div className={S.container()}>
          <h2 className={S.header()}>Latest updates</h2>
          <Separator className="bg-background/50" />

          {isLoading && (
            <div className={S.loading()}>
              <i className="ri-loader-4-fill text-4xl animate-spin" />
            </div>
          )}

          {!!data &&
            !isLoading &&
            data.result.entries.map((entry: ChangeLog, index: number) => (
              <React.Fragment key={entry.id}>
                <div className="w-[380px]">
                  <div className={S.title()}>
                    <span>
                      {entry.types.length > 0 && (
                        <Badge variant="success" className="capitalize">
                          {entry.types[0]}
                        </Badge>
                      )}
                    </span>
                    <p>{entry.title}</p>
                  </div>

                  <ReactMarkdown className="mb-3 text-sm w-full [&_p]:w-full [&_p]:last-child:truncate">
                    {entry.markdownDetails !== null &&
                    entry.markdownDetails !== undefined
                      ? entry.markdownDetails.split("\n").slice(0, 3).join("\n")
                      : ""}
                  </ReactMarkdown>

                  <span className="text-sm">
                    <i className="ri-time-line mr-3" />
                    {dayjs(entry.publishedAt).format("MMM D, YYYY")}
                  </span>
                </div>

                {index !== data.result.entries.length - 1 && (
                  <Separator className="bg-background/50" />
                )}
              </React.Fragment>
            ))}

          <Link
            className={S.link()}
            href="https://jollycode.canny.io/changelog"
          >
            Read more
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
