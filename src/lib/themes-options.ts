export const themes = {
  hyper: {
    background:
      "bg-theme-hyper",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css",
  },
  "github-dark": {
    background:
      "bg-theme-github",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css",
  },
  candy: {
    background: "bg-gradient-to-br from-amber-100 via-blue-400 to-orange-300",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/chalk.min.css",
  },
  sublime: {
    background: "bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark.min.css",
  },
  monokai: {
    background:
      "bg-theme-monokai",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/monokai-sublime.min.css",
  },
  "night-owl": {
    background: "bg-gradient-to-r from-emerald-300 via-blue-400 to-purple-600",
    theme:
      // "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/tokyo-night-dark.min.css",
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/night-owl.min.css",
  },
  peach: {
    background: "bg-gradient-to-br from-rose-200 to-orange-300",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/base16/zenburn.min.css",
  },
  teal: {
    background: "bg-gradient-to-tl from-teal-500 to-teal-900",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/gradient-dark.min.css",
  },
  flamingo: {
    background: "bg-gradient-to-br from-rose-500 via-rose-600 to-[#EA6E51]",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/panda-syntax-dark.min.css",
  },
  creamy: {
    background: "bg-gradient-to-br from-[#8baaaa] via-[#ae8b9c] to-stone-500",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/devibeans.min.css",
  },
  gotham: {
    background:
      "bg-gradient-to-tr from-[#29323c]/50 via-[#485563] to-slate-800",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/lightfair.min.css",
    // "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/kimbie-dark.min.css",
    // "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github-dark-dimmed.min.css",
  },
  ice: {
    background: "bg-gradient-to-br from-rose-100 to-teal-200",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/color-brewer.min.css",
  },
  blue: {
    background: "bg-gradient-to-br from-blue-400 via-sky-400 to-blue-700",
    theme:
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/hybrid.min.css",
  },
};

export type ThemeProps = keyof typeof themes;
