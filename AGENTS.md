# Repository Guidelines

## Project Structure & Module Organization
- Next.js App Router lives in `src/app` (routes, layouts, metadata, providers). Shared stores sit in `src/app/store`.
- Feature flows are grouped in `src/features/*` (e.g., `code-editor`, `snippets`, `share-code`); keep new domain logic in its own feature folder.
- Reusable building blocks are in `src/components` (`ui` design system, analytics, SEO helpers, session sync). Assets and marketing visuals sit in `src/assets`.
- Cross-cutting helpers live in `src/lib` (config, analytics, query client) and `src/utils` (Supabase client, formatting). Supabase migrations live under `supabase/migrations`.

## Build, Test, and Development Commands
- Install: `pnpm install` (repo tracks `pnpm-lock.yaml`).
- Run locally: `pnpm dev` (Next dev server).
- Production build: `pnpm build`; serve build: `pnpm start`.
- Lint & format: `pnpm lint` (ESLint with Prettier rules); auto-fix common issues: `pnpm lint:fix`.

## Coding Style & Naming Conventions
- TypeScript-first, React function components; prefer server components unless interactivity is required (`"use client"`).
- Component folders use kebab-case; exported components/hooks use PascalCase (components) and camelCase (hooks/utilities). Keep route files as Next expects (`page.tsx`, `layout.tsx`, `route.ts`).
- Use the `src/components/ui` primitives and `cn` helper for styling; align with existing Tailwind tokens and CSS variables in `src/app/globals.css`.
- Let Prettier (via ESLint) handle formatting; avoid manual style deviations.

## Testing Guidelines
- No automated test suite is present yet. When adding tests, co-locate `*.test.ts(x)` or `__tests__` near the code, and favor React Testing Library/Vitest patterns for components and helpers.
- For UI-heavy changes today, include a quick manual checklist in the PR (e.g., “snippet save works”, “share image renders”) until tests are in place.

## Commit & Pull Request Guidelines
- Git history uses an emoji + type prefix pattern (e.g., `:sparkles: feat: …`, `:wrench: refactor: …`, `fix: …`). Follow that style and keep subjects concise.
- PRs should describe intent, note any env vars touched (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Sentry/PostHog keys), and link related issues. Include screenshots or short clips for UI changes and mention manual checks run.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit keys. Required keys include Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and Sentry/PostHog credentials where applicable.
- When developing analytics/Sentry changes, guard them behind environment checks to keep local runs noise-free.

## Usage Limits & Plans
- Free plan caps: 10 snippets, 10 animations, 5 slides per animation. Pro plan removes limits.
- Usage counts live in `profiles` and `usage_limits` with helper RPCs (`check_*_limit`, `increment_*`, `decrement_*`).
- Use `src/lib/services/usage-limits.ts` + `src/features/user/queries.ts` for limit checks and usage fetch/invalidation.
- Surface upgrade prompts via `UpgradeDialog` and show current usage with `UsageStatsWidget`.
