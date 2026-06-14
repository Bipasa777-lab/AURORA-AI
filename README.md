# Aurora — AI-Powered Health Companion

A full-stack health companion app that helps users track hydration, sleep, habits, and nutrition — with an AI voice companion that learns your patterns.

## Run & Operate

You can run the application in two ways:

### 1. Locally (Recommended)
Simply run the launcher script from the root directory:
```bash
./run-dev.sh
```
This script will load `.env`, start local PostgreSQL, push database schemas, and concurrently launch the Express backend (port `8080`) and the Vite React frontend (port `8082`).

### 2. Using Docker Compose
If you have Docker installed, you can spin up the database, API, and frontend in containerized environments:
```bash
docker compose up --build
```

### Manual Monorepo Commands
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/aurora dev` — run the frontend (port 8082)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, shadcn/ui, wouter routing, Recharts
- API: Express 5, served at `/api`
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (Replit-managed), cookie-based web auth
- AI: OpenAI — gpt-4o-mini for chat, Whisper-1 for voice transcription, TTS-1 for speech
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schema (users, hydration, sleep, habits, meal_logs, health_memories, conversations, messages)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — auto-generated React Query hooks + Zod schemas (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts` — Clerk auth proxy
- `artifacts/aurora/src/App.tsx` — Clerk provider + wouter routing
- `artifacts/aurora/src/pages/` — all frontend pages
- `artifacts/aurora/src/components/layout/app-layout.tsx` — sidebar + mobile nav layout
- `artifacts/aurora/src/index.css` — Aurora theme (teal primary, purple accent, dark navy)

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives code generation. Always edit `openapi.yaml`, then run codegen — never edit generated files.
- **Orval mutations use `{ data: ... }` not `{ body: ... }`** — generated hooks use `data` as the request body wrapper.
- **Voice AI is custom, not template-based**: Uses OpenAI directly (Whisper-1 → gpt-4o-mini → TTS-1). Do NOT use `@workspace/integrations-openai-ai-server` audio client — it requires AI Integration env vars not available on free tier.
- **Clerk auth is cookie-based**: No bearer tokens or `setAuthTokenGetter` in the web app. The Clerk session cookie is automatically sent. 401s from the API should be debugged as session/middleware issues, not token issues.
- **One-time 500 on first login**: A race condition on the very first dashboard request after user creation resolves itself on retry — React Query auto-retries once.

## Product

- **Dashboard** — at-a-glance view of today's hydration, sleep, habits, and nutrition with quick-log shortcuts
- **Hydration Tracker** — log water intake (quick amounts + custom), bar chart of 7-day history, progress toward daily goal
- **Sleep Tracker** — log sleep with bedtime/wake time/quality score, area chart of 14-day trends, weekly analysis
- **Habits** — create daily habits with icon/color, check them off or skip, streak tracking
- **Nutrition** — log meals with macro tracking (protein/carbs/fat), pie chart of daily macros
- **Aurora AI** — text + voice chat with context from all health data; voice uses Whisper transcription + TTS playback
- **Streaks & Achievements** — active streaks across all categories, achievement system
- **Reports** — weekly (radar chart + category breakdowns) and monthly summary reports
- **Profile/Onboarding** — health goals, daily targets, activity level, schedule

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Always run codegen after editing openapi.yaml** — `pnpm --filter @workspace/api-spec run codegen`
- **Voice AI requires OPENAI_API_KEY** — not the Replit AI integration keys
- **`pnpm --filter @workspace/db run push` is dev-only** — in prod, apply migrations manually
- **Orval-generated hooks pass request body as `{ data: ... }` not `{ body: ... }`**
- **`Link asChild` pattern for wouter v3** — use `<Link href="..." asChild><Button>...</Button></Link>` to avoid nested `<a>` hydration errors
- **Clerk publishableKey must use `publishableKeyFromHost`** — never use raw env var

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk setup and customization details
