import { cva } from "class-variance-authority";

export const container = cva(["fixed", "right-8", "hidden", "md:block"]);

export const content = cva(["flex", "flex-col", "items-center", "gap-2"]);
