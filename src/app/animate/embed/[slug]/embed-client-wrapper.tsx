"use client";

import dynamic from "next/dynamic";
import type { AnimateEmbedClientProps } from "@/features/animation/embed-view";

const AnimateEmbedClient = dynamic<AnimateEmbedClientProps>(
    () => import("@/features/animation/embed-view"),
    { ssr: false }
);

export function EmbedClientWrapper({ payload, slug }: AnimateEmbedClientProps) {
    return <AnimateEmbedClient payload={payload} slug={slug} />;
}
