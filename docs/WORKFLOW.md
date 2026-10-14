# Як працювати з проєктом (шпаргалка)

## Запуск щодня

1. Відкрий **Docker Desktop** (кит у рядку меню).
2. Термінал 1 — база + сервер:
   ```bash
   cd ~/Desktop/derma
   pnpm db:up
   pnpm --filter @dermamind/api prisma:deploy
   pnpm --filter @dermamind/api dev
   ```
   Перевірка: http://localhost:3000/v1/health → `"status":"ok"` · Swagger: http://localhost:3000/docs
3. Термінал 2 — застосунок:
   ```bash
   cd ~/Desktop/derma
   pnpm --filter @dermamind/mobile start
   ```
   На iPhone: Expo Go → Development servers → **DermaMind** (той самий Wi-Fi).
4. Термінал 3 — Claude Code:
   ```bash
   cd ~/Desktop/derma
   claude
   ```

## Якщо щось не працює

| Помилка | Що робити |
|---|---|
| `failed to connect to the docker API` | Не запущений Docker Desktop — відкрий його, зачекай 30 с |
| `P1001: Can't reach database server` | Спочатку `pnpm db:up` (і Docker має бути запущений) |
| Expo Go: «not signed in to Expo CLI» | `npx expo login` (акаунт `oleksandr_0102`) |
| `Web Bundling failed … react-native-web` | Це вебверсія в браузері — ігнорувати, дивимось на телефоні |
| Порт зайнятий | `Ctrl+C` у старому терміналі або `lsof -i :8081` / `:3000` |

## Після кожного спринту

- У Claude Code: `git push`
- Написати Claude в чат «готово» — він перевірить код і дасть наступне завдання.

## Статус спринтів

- [x] Спринт 0 — фундамент (монорепо, API, база, 5 вкладок) — 14.10.2026
- [ ] Спринт 0 (залишок) — імпорт даних: покласти SQL Саші і файл Hebe (42 продукти) у `data/`
- [x] Спринт 1 — акаунт і анкета (онбординг O1–O22) — 14.10.2026
- [ ] Спринт 2 — алгоритм і каталог
- [ ] Спринт 3 — сканер і аналіз складу
- [ ] Спринт 4 — функції AI
- [ ] Спринт 5 — рутина і улюблені
- [ ] Спринт 6 — доопрацювання і дані
- [ ] Спринт 7 — тести і бета
- [ ] Спринт 8 — публікація

## Завдання для Claude Code

### Спринт 1 — акаунт і анкета

```
Read docs/PLAN.md sections 3.3, 3.4, 3.6, 6.1, 9 (Sprint 1) and the mockups 01–04 in docs/mockups/.
Do Sprint 1:
- api `auth` module: guest account, email+password (argon2), JWT access 15 min + refresh 30 days
  with rotation, logout, password reset stub; Apple/Google sign-in as endpoints with TODO for real keys.
- api `me` module: GET /v1/me, PUT /v1/me/quiz (validated with class-validator), DELETE /v1/me.
- packages/scoring: skin type / barrier / sensitivity calculation from quiz answers (section 6.1) + tests.
- mobile: onboarding O1–O22 per section 6.1 matching the mockups (QuestionScreen, ZoneAccordion,
  progress bar, result screen O14), quiz state in Zustand, sent with PUT /v1/me/quiz after account creation.
- mobile: tokens in expo-secure-store, API client with auto refresh; Profile tab skeleton.
- e2e tests for auth + me; add DECISIONS.md entries. Small commits, push at the end.
Ask me before anything that needs real Apple/Google credentials.
```

### Перегляд у браузері (за бажанням)

```
Add web support to apps/mobile: npx expo install react-native-web react-dom @expo/metro-runtime, so `expo start --web` works. Commit.
```

## Do poprawki później (z testów na telefonie)

- [ ] Unikane składniki: zapisywać nazwę INCI (Cocos Nucifera Oil, Lanolin), polską tylko jako podpis — teraz mieszane („Olej kokosowy”, „Lanolina”)
- [ ] Sprawdzić jasny motyw na telefonie (makiety są jasne; testowane tylko w ciemnym)
- [ ] „Kontynuuj z Apple / Google” — teraz zaślepki; ukryć albo pokazać komunikat, dopóki nie ma kluczy
- [ ] Ekran wyniku O14: nagłówek „Twój typ skóry” lekko ucięty pod paskiem postępu przy przewijaniu
