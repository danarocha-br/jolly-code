/**
 * Minimal color mappings for OG images - optimized for Edge Runtime bundle size
 */

export type SyntaxColorMap = {
  base: string;
  background: string;
  keyword: string;
  string: string;
  comment: string;
  function: string;
  number: string;
  title: string;
  params: string;
  built_in: string;
  literal: string;
  attr: string;
  variable: string;
  operator: string;
  punctuation: string;
  meta: string;
  tag: string;
  name: string;
  property: string;
  regexp: string;
  selector: string;
  subst: string;
  symbol: string;
  type: string;
};

// Base theme used as default
const base: SyntaxColorMap = {
  base: "#e6edf3", background: "#0d1117", keyword: "#ff7b72", string: "#a5d6ff",
  comment: "#8b949e", function: "#d2a8ff", number: "#79c0ff", title: "#ffa657",
  params: "#e6edf3", built_in: "#ffa657", literal: "#79c0ff", attr: "#79c0ff",
  variable: "#ffa657", operator: "#ff7b72", punctuation: "#e6edf3", meta: "#d2a8ff",
  tag: "#7ee787", name: "#7ee787", property: "#79c0ff", regexp: "#a5d6ff",
  selector: "#7ee787", subst: "#ffa657", symbol: "#79c0ff", type: "#ffa657",
};

export const ogThemeColors: Record<string, SyntaxColorMap> = {
  // All themes use the same base colors to minimize bundle size
  sublime: base,
  hyper: base,
  "github-dark": base,
  monokai: base,
  "night-owl": base,
  nightOwl: base,
  blue: base,
  gotham: base,
  candy: base,
  peach: base,
  teal: base,
  flamingo: base,
  creamy: base,
  ice: base,
  dracula: base,
  nord: base,
};

export const defaultThemeColors = base;

export function getThemeColors(_theme: string): SyntaxColorMap {
  return base;
}
