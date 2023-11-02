"use client";

import { notFound, redirect } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Logo } from "@/components/ui/logo";

type SharedLinkPageProps = {
  params: {
    shared_link: string;
  };
};

/**
 * Redirects to the original URL of the shared link.
 *
 * @param params - The props object containing the parameters.
 * @return {JSX.Element} Redirects to the original URL of the shared link.
 */
export default function SharedLinkPage({ params }: SharedLinkPageProps) {
  const { shared_link } = params;

  const { data, isLoading, error } = useQuery(
    ["shared_link", shared_link],
    async () => {
      if (!shared_link) {
        throw new Error("Shared link not found");
      }

      const params = new URLSearchParams();
      params.append("slug", shared_link);

      const response = await fetch(`/api/shorten-url?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok || !response) {
        throw new Error("Response not OK");
      }

      const { url, id } = await response.json();

      return { id, url };
    },
    {
      async onSuccess(data) {
        if (data.id) {
          await fetch(`/api/save-shared-url-visits`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: data?.id,
            }),
          });
        }
      },
    }
  );

  if (!shared_link || error) {
    return notFound();
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex justify-center items-center">
        <Logo
          variant="short"
          className="animate-pulse grayscale duration-[0.75s]"
        />
      </div>
    );
  }

  redirect(data?.url);
}
