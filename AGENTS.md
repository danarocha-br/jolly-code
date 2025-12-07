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
- Store secrets in `.env.local`; never commit keys. Required keys include Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), Stripe (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs), and Sentry/PostHog credentials where applicable.
- When developing analytics/Sentry changes, guard them behind environment checks to keep local runs noise-free.
- Stripe webhook endpoint: `/api/webhooks/stripe` - must be configured in Stripe Dashboard with events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`.

## Usage Limits & Plans
### Plan Tiers
- **Free**: 0 saved snippets/animations, 3 slides per animation, 3 public shares
- **Started** ($5/mo or $3/mo yearly): 50 snippets, 50 animations, 10 slides per animation, 10 folders, 50 video exports, 50 public shares
- **Pro** ($9/mo or $7/mo yearly): Unlimited everything + watermark removal + priority support

### Implementation Details
- Plan configuration lives in `src/lib/config/plans.ts` with helper functions (`getPlanConfig`, `isLimitReached`, `getUsagePercentage`, etc.)
- Database schema in migration `supabase/migrations/20251207103258_add_usage_limits_and_plans.sql`:
  - `profiles` table has plan columns: `plan` (enum), `plan_updated_at`, usage counters, and Stripe fields
  - PostgreSQL RPC functions handle atomic limit checks and counter updates
- Usage tracking service: `src/lib/services/usage-limits.ts` provides `checkSnippetLimit`, `checkAnimationLimit`, `incrementUsageCount`, `decrementUsageCount`, `getUserUsage`
- Server actions enforce limits: `src/actions/snippets/create-snippet.ts` and `src/actions/animations/create-animation.ts` check RPCs before saving
- React Query hooks: `src/features/user/queries.ts` exports `useUserUsage()` and `useUserPlan()` for client-side usage display
- UI components:
  - `src/components/usage-stats-widget` shows current usage with progress bars and upgrade CTA
  - `src/components/ui/upgrade-dialog` displays plan comparison and pricing for upgrades
- Animation store (`src/app/store/animation-store.ts`) enforces slide limits via `addSlide({ maxSlides, onLimit })` parameter

### Stripe Integration
- Service layer: `src/lib/services/stripe.ts` handles customer management, checkout sessions, subscriptions, and webhooks
- Client-side: `src/lib/stripe-client.ts` loads Stripe.js; `src/actions/stripe/checkout.ts` provides `createCheckoutSession()` and `createPortalSession()` server actions
- API endpoints:
  - `/api/checkout` - Creates Stripe checkout session for plan upgrades
  - `/api/webhooks/stripe` - Handles subscription lifecycle events and updates user plans
  - `/api/customer-portal` - Creates Stripe customer portal session for subscription management
- Webhooks automatically update `profiles` table when subscriptions are created, updated, or canceled
- Price IDs must be configured in environment variables for both monthly and yearly billing for Started and Pro plans
