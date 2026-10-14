# DermaMind AI — instructions for Claude Code

Diploma project (Collegium Da Vinci, Poznań, defense Feb 2027). Mobile app that scores how well a
cosmetic product matches the user's skin, based on its INCI ingredients. Team of 4; tech lead: Oleksandr.

**The full spec is `docs/PLAN.md` — read the relevant section before every task.** Screen mockups are
in `docs/mockups/` (target look: SkinSort-style, our own brand).

## Stack (decided — don't swap without asking)
- `apps/mobile` — Expo + React Native, TypeScript, Expo Router, TanStack Query, Zustand, expo-secure-store
- `apps/api` — NestJS 11 on Node 22, Prisma, PostgreSQL 16, versioned under `/v1`
- `packages/scoring` — shared TS Match Score (0–100, rule-based), Vitest
- pnpm workspaces monorepo
- Hosting later: API on Render (free), DB on Supabase used **only as plain Postgres** via `DATABASE_URL`
  (no Supabase Auth, no direct DB calls from the app). Locally: Postgres in docker-compose.
- Claude API is called **only from the server** (`ai` module, with `ai_cache`). Never from the app.

## Rules
- Never commit secrets. Only `.env.example` files with placeholders. Never print secret values.
- UI copy is Polish. Code, identifiers and commit messages in English.
- Keep `docs/DECISIONS.md` (in Polish): for each meaningful choice — decision, why, alternatives.
  This feeds the written diploma documentation, so write it like a human engineer, briefly.
- Design tokens: `docs/PLAN.md` section 7.1. Score colours: 75+ green, 50–74 purple, 30–49 orange,
  <30 red; product with an avoided ingredient is capped at 40 ("Nie pasuje").
- Don't deploy, create cloud accounts or touch app stores — Oleksandr does that by hand.
- Work one sprint at a time (section 9). At the end, summarise what changed and how to run it.
- Oleksandr prefers explanations in Ukrainian, short and direct.
