/**
 * Color mappings for syntax highlighting in OG images
 * These colors are based on popular highlight.js themes
 * and are optimized for Edge Runtime (no external CSS)
 */

export type SyntaxColorMap = {
  base: string; // Default text color
  background: string; // Code window background
  keyword: string; // if, const, let, function, etc.
  string: string; // String literals
  comment: string; // Comments
  function: string; // Function names
  number: string; // Numbers
  title: string; // Class/function declarations
  params: string; // Function parameters
  built_in: string; // Built-in types/functions
  literal: string; // true, false, null
  attr: string; // Attributes
  variable: string; // Variables
  operator: string; // +, -, *, etc.
  punctuation: string; // Brackets, parentheses
  meta: string; // Meta tags, decorators
  tag: string; // HTML/XML tags
  name: string; // Tag names
  property: string; // Object properties
  regexp: string; // Regular expressions
  selector: string; // CSS selectors
  subst: string; // Template substitutions
  symbol: string; // Symbols
  type: string; // Type annotations
};

export const ogThemeColors: Record<string, SyntaxColorMap> = {
  // Atom One Dark (Hyper)
  hyper: {
    base: "#abb2bf",
    background: "#282c34",
    keyword: "#c678dd",
    string: "#98c379",
    comment: "#5c6370",
    function: "#61afef",
    number: "#d19a66",
    title: "#e5c07b",
    params: "#abb2bf",
    built_in: "#e5c07b",
    literal: "#56b6c2",
    attr: "#d19a66",
    variable: "#e06c75",
    operator: "#56b6c2",
    punctuation: "#abb2bf",
    meta: "#61afef",
    tag: "#e06c75",
    name: "#e06c75",
    property: "#d19a66",
    regexp: "#98c379",
    selector: "#e06c75",
    subst: "#e06c75",
    symbol: "#56b6c2",
    type: "#e5c07b",
  },

  // GitHub Dark
  "github-dark": {
    base: "#e6edf3",
    background: "#0d1117",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    comment: "#8b949e",
    function: "#d2a8ff",
    number: "#79c0ff",
    title: "#ffa657",
    params: "#e6edf3",
    built_in: "#ffa657",
    literal: "#79c0ff",
    attr: "#79c0ff",
    variable: "#ffa657",
    operator: "#ff7b72",
    punctuation: "#e6edf3",
    meta: "#d2a8ff",
    tag: "#7ee787",
    name: "#7ee787",
    property: "#79c0ff",
    regexp: "#a5d6ff",
    selector: "#7ee787",
    subst: "#ffa657",
    symbol: "#79c0ff",
    type: "#ffa657",
  },

  // Base16 Chalk (Candy)
  candy: {
    base: "#d0d0d0",
    background: "#151515",
    keyword: "#fb9fb1",
    string: "#acc267",
    comment: "#505050",
    function: "#6fc2ef",
    number: "#ddb26f",
    title: "#eda987",
    params: "#d0d0d0",
    built_in: "#eda987",
    literal: "#12cfc0",
    attr: "#ddb26f",
    variable: "#fb9fb1",
    operator: "#12cfc0",
    punctuation: "#d0d0d0",
    meta: "#6fc2ef",
    tag: "#fb9fb1",
    name: "#fb9fb1",
    property: "#ddb26f",
    regexp: "#acc267",
    selector: "#fb9fb1",
    subst: "#fb9fb1",
    symbol: "#12cfc0",
    type: "#eda987",
  },

  // GitHub Dark (Sublime - reuses github-dark colors)
  sublime: {
    base: "#e6edf3",
    background: "#0d1117",
    keyword: "#ff7b72",
    string: "#a5d6ff",
    comment: "#8b949e",
    function: "#d2a8ff",
    number: "#79c0ff",
    title: "#ffa657",
    params: "#e6edf3",
    built_in: "#ffa657",
    literal: "#79c0ff",
    attr: "#79c0ff",
    variable: "#ffa657",
    operator: "#ff7b72",
    punctuation: "#e6edf3",
    meta: "#d2a8ff",
    tag: "#7ee787",
    name: "#7ee787",
    property: "#79c0ff",
    regexp: "#a5d6ff",
    selector: "#7ee787",
    subst: "#ffa657",
    symbol: "#79c0ff",
    type: "#ffa657",
  },

  // Monokai
  monokai: {
    base: "#f8f8f2",
    background: "#272822",
    keyword: "#f92672",
    string: "#e6db74",
    comment: "#75715e",
    function: "#a6e22e",
    number: "#ae81ff",
    title: "#a6e22e",
    params: "#fd971f",
    built_in: "#66d9ef",
    literal: "#ae81ff",
    attr: "#a6e22e",
    variable: "#f8f8f2",
    operator: "#f92672",
    punctuation: "#f8f8f2",
    meta: "#66d9ef",
    tag: "#f92672",
    name: "#a6e22e",
    property: "#a6e22e",
    regexp: "#e6db74",
    selector: "#a6e22e",
    subst: "#f8f8f2",
    symbol: "#ae81ff",
    type: "#66d9ef",
  },

  // Night Owl
  "night-owl": {
    base: "#d6deeb",
    background: "#011627",
    keyword: "#c792ea",
    string: "#ecc48d",
    comment: "#637777",
    function: "#82aaff",
    number: "#f78c6c",
    title: "#82aaff",
    params: "#d7dbe0",
    built_in: "#addb67",
    literal: "#ff5874",
    attr: "#addb67",
    variable: "#7fdbca",
    operator: "#c792ea",
    punctuation: "#d6deeb",
    meta: "#82aaff",
    tag: "#7fdbca",
    name: "#7fdbca",
    property: "#addb67",
    regexp: "#ecc48d",
    selector: "#7fdbca",
    subst: "#d3423e",
    symbol: "#ff5874",
    type: "#addb67",
  },

  // Base16 Zenburn (Peach)
  peach: {
    base: "#dcdccc",
    background: "#383838",
    keyword: "#f0dfaf",
    string: "#cc9393",
    comment: "#7f9f7f",
    function: "#8cd0d3",
    number: "#dca3a3",
    title: "#efef8f",
    params: "#dcdccc",
    built_in: "#efef8f",
    literal: "#93e0e3",
    attr: "#dca3a3",
    variable: "#f0dfaf",
    operator: "#93e0e3",
    punctuation: "#dcdccc",
    meta: "#8cd0d3",
    tag: "#f0dfaf",
    name: "#f0dfaf",
    property: "#dca3a3",
    regexp: "#cc9393",
    selector: "#f0dfaf",
    subst: "#f0dfaf",
    symbol: "#93e0e3",
    type: "#efef8f",
  },

  // Gradient Dark (Teal)
  teal: {
    base: "#dedede",
    background: "#1f1f1f",
    keyword: "#b66bb2",
    string: "#a7ce93",
    comment: "#888888",
    function: "#75c1f3",
    number: "#eddd3d",
    title: "#f08d49",
    params: "#dedede",
    built_in: "#f08d49",
    literal: "#75c1f3",
    attr: "#eddd3d",
    variable: "#f08d49",
    operator: "#b66bb2",
    punctuation: "#dedede",
    meta: "#75c1f3",
    tag: "#b66bb2",
    name: "#b66bb2",
    property: "#eddd3d",
    regexp: "#a7ce93",
    selector: "#b66bb2",
    subst: "#f08d49",
    symbol: "#75c1f3",
    type: "#f08d49",
  },

  // Panda Syntax Dark (Flamingo)
  flamingo: {
    base: "#e6e6e6",
    background: "#292a2b",
    keyword: "#ff75b5",
    string: "#19f9d8",
    comment: "#676b79",
    function: "#ffb86c",
    number: "#ffb86c",
    title: "#ffb86c",
    params: "#e6e6e6",
    built_in: "#45fff4",
    literal: "#ff9ac1",
    attr: "#ffb86c",
    variable: "#ff9ac1",
    operator: "#ff75b5",
    punctuation: "#e6e6e6",
    meta: "#45fff4",
    tag: "#ff75b5",
    name: "#ff75b5",
    property: "#ffb86c",
    regexp: "#19f9d8",
    selector: "#ff75b5",
    subst: "#ff9ac1",
    symbol: "#45fff4",
    type: "#45fff4",
  },

  // Devibeans (Creamy)
  creamy: {
    base: "#cfd5d8",
    background: "#1a1b26",
    keyword: "#8f83d2",
    string: "#86a56e",
    comment: "#535965",
    function: "#60a7a0",
    number: "#ffa457",
    title: "#60a7a0",
    params: "#cfd5d8",
    built_in: "#60a7a0",
    literal: "#f78c6c",
    attr: "#ffa457",
    variable: "#cfd5d8",
    operator: "#8f83d2",
    punctuation: "#cfd5d8",
    meta: "#60a7a0",
    tag: "#8f83d2",
    name: "#8f83d2",
    property: "#ffa457",
    regexp: "#86a56e",
    selector: "#8f83d2",
    subst: "#cfd5d8",
    symbol: "#f78c6c",
    type: "#60a7a0",
  },

  // Lightfair (Gotham)
  gotham: {
    base: "#e8e8e3",
    background: "#2c3e50",
    keyword: "#c397d8",
    string: "#70c0b1",
    comment: "#969896",
    function: "#7aa6da",
    number: "#e78c45",
    title: "#7aa6da",
    params: "#e8e8e3",
    built_in: "#7aa6da",
    literal: "#c397d8",
    attr: "#e78c45",
    variable: "#e8e8e3",
    operator: "#c397d8",
    punctuation: "#e8e8e3",
    meta: "#7aa6da",
    tag: "#c397d8",
    name: "#c397d8",
    property: "#e78c45",
    regexp: "#70c0b1",
    selector: "#c397d8",
    subst: "#e8e8e3",
    symbol: "#c397d8",
    type: "#7aa6da",
  },

  // Color Brewer (Ice)
  ice: {
    base: "#000000",
    background: "#ffffff",
    keyword: "#7c3aed",
    string: "#b45309",
    comment: "#999988",
    function: "#0086b3",
    number: "#009999",
    title: "#795da3",
    params: "#000000",
    built_in: "#0086b3",
    literal: "#009999",
    attr: "#009999",
    variable: "#008080",
    operator: "#7c3aed",
    punctuation: "#000000",
    meta: "#0086b3",
    tag: "#7c3aed",
    name: "#7c3aed",
    property: "#009999",
    regexp: "#b45309",
    selector: "#7c3aed",
    subst: "#000000",
    symbol: "#009999",
    type: "#795da3",
  },

  // Hybrid (Blue)
  blue: {
    base: "#c5c8c6",
    background: "#1d1f21",
    keyword: "#b294bb",
    string: "#b5bd68",
    comment: "#707880",
    function: "#81a2be",
    number: "#de935f",
    title: "#f0c674",
    params: "#c5c8c6",
    built_in: "#f0c674",
    literal: "#8abeb7",
    attr: "#de935f",
    variable: "#cc6666",
    operator: "#b294bb",
    punctuation: "#c5c8c6",
    meta: "#81a2be",
    tag: "#cc6666",
    name: "#cc6666",
    property: "#de935f",
    regexp: "#b5bd68",
    selector: "#cc6666",
    subst: "#cc6666",
    symbol: "#8abeb7",
    type: "#f0c674",
  },
};

// Fallback theme for unknown themes
export const defaultThemeColors = ogThemeColors["sublime"];

/**
 * Get color map for a specific theme
 */
export function getThemeColors(theme: string): SyntaxColorMap {
  return ogThemeColors[theme] || defaultThemeColors;
}

