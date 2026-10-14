# DermaMind AI

Mobile app that scores how well a cosmetic matches your skin, based on its INCI ingredients.
Full spec: [`docs/PLAN.md`](docs/PLAN.md) · decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md).

| Path               | What                                         |
| ------------------ | -------------------------------------------- |
| `apps/mobile`      | Expo + React Native app (Expo Router)        |
| `apps/api`         | NestJS 11 API under `/v1`, Prisma, Postgres  |
| `packages/scoring` | Shared Match Score logic (TypeScript+Vitest) |

## Requirements

Node 22, pnpm (`corepack enable`), Docker Desktop. For the app: Expo Go on a phone, or an
Android emulator / iOS simulator.

## Run locally

```sh
pnpm install

# 1. Database (Postgres 16 in Docker)
pnpm db:up

# 2. API → http://localhost:3000/v1/health, Swagger on http://localhost:3000/docs
cp apps/api/.env.example apps/api/.env
pnpm --filter @dermamind/api prisma:deploy
pnpm --filter @dermamind/api dev

# 3. App (in another terminal)
cp apps/mobile/.env.example apps/mobile/.env   # set EXPO_PUBLIC_API_URL for your device
pnpm --filter @dermamind/mobile start
```

## Checks (same as CI)

```sh
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test
pnpm --filter @dermamind/api test:e2e          # needs `pnpm db:up`, uses its own dermamind_test DB
pnpm --filter @dermamind/api-client generate   # after changing API DTOs/endpoints
```
