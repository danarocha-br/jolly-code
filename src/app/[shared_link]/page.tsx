"use client";

import { use } from "react";
import { notFound, redirect } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Logo } from "@/components/ui/logo";

type SharedLinkPageProps = {
  params: Promise<{
    shared_link: string;
  }>;
};

/**
 * Redirects to the original URL of the shared link.
 *
 * @param params - The props object containing the parameters.
 * @return {JSX.Element} Redirects to the original URL of the shared link.
 */
export default function SharedLinkPage({ params }: SharedLinkPageProps) {
  const { shared_link } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["shared_link", shared_link],
    queryFn: async () => {
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

      if (id) {
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

      return { id, url };
    },
  });

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
