# Dziennik decyzji

Krótkie notatki o ważniejszych wyborach technicznych: co zdecydowaliśmy, dlaczego i co odrzuciliśmy.
Materiał do rozdziału o projekcie systemu w pracy dyplomowej.

---

## Sprint 0 (14.10.2026)

### D-01. Jeden plik z decyzjami zamiast osobnych ADR

- **Decyzja:** wszystkie decyzje w `docs/DECISIONS.md`, w kolejności chronologicznej.
- **Dlaczego:** przy 4 osobach i krótkich sprintach jeden plik łatwiej czytać i przeglądać w PR. Do pracy
  dyplomowej i tak przepiszemy to na ciągły tekst.
- **Alternatywy:** katalog `docs/decisions/ADR-xxx.md` z planu (sekcja 8) — więcej formalności, mało
  zysku na tym etapie. Jeśli plik urośnie, podzielimy go.

### D-02. Monorepo na samych pnpm workspaces

- **Decyzja:** `apps/mobile`, `apps/api`, `packages/scoring` w jednym repozytorium, spięte przez
  `pnpm-workspace.yaml`. Skrypty w korzeniu (`lint`, `typecheck`, `test`) uruchamiają się we wszystkich
  pakietach (`pnpm -r`).
- **Dlaczego:** trzy pakiety to za mało, żeby opłacało się narzędzie do orkiestracji. pnpm sam linkuje
  `@dermamind/scoring` do aplikacji i serwera.
- **Alternatywy:** Turborepo lub Nx (cache buildów — dodamy, gdy CI zacznie trwać za długo), osobne
  repozytoria (algorytm trzeba by publikować jako paczkę).

### D-03. Wersje narzędzi

- **Decyzja:** Node 22, NestJS 11, Expo SDK 57 (React Native 0.86), Prisma 7.10, TypeScript 6.0,
  ESLint 10, Vitest 5, Jest 30.
- **Dlaczego:** NestJS 11 jest wpisany w plan — wersja 12 już wyszła, ale przejście na nią to osobna
  decyzja i nie daje nam teraz nic konkretnego. TypeScript 6.0 to wersja zalecana przez Expo SDK 57;
  TS 7 nie jest jeszcze wspierany przez typescript-eslint i ts-jest. Prisma 8 jest dopiero w wersji RC,
  więc bierzemy ostatnią stabilną 7.x.
- **Alternatywy:** zawsze „latest” — ryzyko niezgodności między narzędziami w środku semestru.

### D-04. Prisma 7 z adapterem `pg`, klient generowany do `src/generated`

- **Decyzja:** `prisma.config.ts` trzyma adres bazy (`DATABASE_URL`), serwer łączy się przez
  `@prisma/adapter-pg`. Klient generuje się do `apps/api/src/generated/prisma` przy `pnpm install` i nie
  trafia do repozytorium.
- **Dlaczego:** tak działa Prisma 7 (adapter jest obowiązkowy). Zwykły sterownik `pg` łączy się z każdym
  PostgreSQL — lokalnym z dockera i z Supabase — więc zmiana hostingu bazy to zmiana jednego ciągu.
- **Alternatywy:** Prisma 6 (stary silnik, za chwilę bez wsparcia), Drizzle (był w becie; rezygnacja
  opisana w planie, sekcja 2).

### D-05. Identyfikatory `Int` zamiast `bigint`

- **Decyzja:** tabele katalogu i rutyn mają klucz `Int @default(autoincrement())` (`serial`).
  Użytkownicy i tokeny mają `uuid`.
- **Dlaczego:** `bigint` w Prisma to `BigInt` w JavaScripcie, którego `JSON.stringify` nie umie
  zserializować — każda odpowiedź API wymagałaby konwersji. Zakres `int` (2,1 mld) wielokrotnie
  przekracza docelowe 150–2000 produktów.
- **Alternatywy:** `bigint` + globalny serializer (więcej kodu bez realnej korzyści), `uuid` wszędzie
  (dłuższe adresy produktów, gorsze indeksy).

### D-06. Typy wyliczeniowe zamiast tekstu z `CHECK`

- **Decyzja:** `time_of_day`, rodzaj półki, status zgłoszenia, budżet i używanie SPF to enumy
  PostgreSQL (w planie były kolumnami `text` z `CHECK`). Wartości są te same co w planie.
- **Dlaczego:** Prisma generuje z enumów typy TypeScript, więc literówka wychodzi już przy kompilacji,
  a nie dopiero w bazie.
- **Alternatywy:** `text` + `CHECK` — działa w bazie, ale w kodzie to zwykły `string`.

### D-07. Co jest w surowym SQL migracji

- **Decyzja:** ograniczenia `CHECK` (zakresy ocen, nastroju, poziomów z quizu), kolumna `products.search`
  (`GENERATED ALWAYS AS to_tsvector(...)`) i widok `product_flags` są dopisane ręcznie w pierwszej
  migracji. CI po migracjach sprawdza, że baza zgadza się ze `schema.prisma` (`migrate diff --exit-code`).
- **Dlaczego:** schemat Prisma nie potrafi tego zapisać, a chcemy, żeby baza sama pilnowała poprawności
  danych — import z Hebe i skrypty nie przechodzą przez walidację API.
- **Dodatkowo:** `ingredient_conflicts` ma `CHECK (a_id < b_id)`, żeby para A–B nie mogła wystąpić drugi
  raz jako B–A.
- **Alternatywy:** walidacja tylko w API — dane z importu mogłyby ją ominąć.

### D-08. Własne konto użytkownika, półki zamiast ulubionych

- **Decyzja:** tabela `users` (e-mail, hash hasła, `apple_sub`, `google_sub`, `is_guest`, rola) i
  `refresh_tokens` (tylko hash) zamiast `auth.users` z Supabase. `profiles.user_id` wskazuje na `users`.
  Tabeli `favorites` nie tworzymy — zastępują ją `shelves` + `shelf_items` (sekcja 3.6).
- **Dlaczego:** Supabase jest dla nas wyłącznie bazą PostgreSQL (sekcja 2.3); logowanie robi nasz serwer.
- **Alternatywy:** Supabase Auth — uzależnienie od dostawcy i logika logowania poza naszym kodem.

### D-09. Wersjonowanie API przez NestJS, Swagger pod `/docs`

- **Decyzja:** `enableVersioning({ type: URI, defaultVersion: '1' })` — wszystkie trasy są pod `/v1/...`.
  Dokumentacja OpenAPI pod `/docs` (JSON: `/docs-json`).
- **Dlaczego:** gdy jakiś endpoint będzie potrzebował zmiany łamiącej kontrakt, dodamy `/v2` tylko dla
  niego, a stare wersje aplikacji w sklepach dalej działają. Swagger posłuży do generowania klienta
  (orval) i jako dokumentacja API w pracy.
- **Alternatywy:** `setGlobalPrefix('v1')` — prostsze, ale `/v2` dla pojedynczej trasy wymagałoby obejść.

### D-10. `GET /v1/health` sprawdza bazę, `GET /v1/app-config` czyta zmienne środowiskowe

- **Decyzja:** health wykonuje `SELECT 1` i przy braku bazy zwraca 503. App-config zwraca
  `minAppVersion`, `latestAppVersion` (z `MIN_APP_VERSION` / `LATEST_APP_VERSION`) i przełączniki funkcji
  (na razie `ai` i `scanner` wyłączone).
- **Dlaczego:** Render używa health checku do restartu usługi — sam „żyję” bez bazy byłby mylący.
  Minimalną wersję aplikacji zmieniamy w ustawieniach hostingu, bez wdrażania kodu.
- **Alternatywy:** `@nestjs/terminus` — za dużo jak na jedno zapytanie; konfiguracja w tabeli bazy —
  dodamy, jeśli przełączników będzie więcej.

### D-11. Testy w Sprincie 0

- **Decyzja:** `packages/scoring` — Vitest. API — Jest + Supertest na prawdziwej aplikacji Nest z atrapą
  Prisma. CI uruchamia też PostgreSQL 16 i sprawdza, że migracje wchodzą na czystą bazę.
- **Dlaczego:** endpointy z tego sprintu prawie nie dotykają bazy. Testy na prawdziwej bazie (plan 10.1)
  dojdą razem z pierwszymi endpointami, które czytają dane (Sprint 1).
- **Alternatywy:** Vitest również dla API — prostsze, ale plan i ekosystem NestJS zakładają Jest.

### D-12. Jedna konfiguracja ESLint w korzeniu

- **Decyzja:** `eslint.config.mjs` w korzeniu: reguły zalecane JS + typescript-eslint dla całego repo,
  `react-hooks` dla aplikacji, `eslint-config-prettier` na końcu. Formatowanie robi tylko Prettier.
- **Dlaczego:** jedno polecenie `pnpm lint` i te same zasady w każdym pakiecie.
- **Alternatywy:** `eslint-config-expo` w aplikacji i osobna konfiguracja Nest — trzy zestawy reguł do
  utrzymania.

### D-13. Skrypty instalacyjne paczek tylko na liście dozwolonych

- **Decyzja:** w `pnpm-workspace.yaml` (`allowBuilds`) dopuszczamy skrypty tylko `prisma` i
  `@prisma/engines`; telemetria `@scarf/scarf` i inne są zablokowane.
- **Dlaczego:** skrypt `postinstall` w zależności to typowa droga ataku na łańcuch dostaw. pnpm domyślnie
  je blokuje, a my świadomie zatwierdzamy tylko to, co potrzebne.

### D-14. Aplikacja: tokeny w `src/theme`, ikony Phosphor, `@dermamind/scoring` ze źródeł

- **Decyzja:** kolory z sekcji 7.1 (jasny i ciemny), odstępy i promienie z 7.3 w `src/theme/tokens.ts`;
  motyw wybiera się automatycznie wg ustawień telefonu. Kolor wyniku liczy `scoreColors()` na podstawie
  progów z `@dermamind/scoring` — ta sama funkcja będzie na serwerze. Pakiet ma w `exports` warunek
  `react-native`, więc Metro bierze z niego bezpośrednio pliki `.ts` (bez osobnego budowania), a Node
  — skompilowany `dist`. Ikony zakładek: Phosphor (aktywna wypełniona). Identyfikator aplikacji
  `com.dermamind.app` jest już w `app.config.ts`.
- **Dlaczego:** progi kolorów w jednym miejscu; jedna implementacja algorytmu dla aplikacji i serwera.
- **Alternatywy:** kopiowanie progów do aplikacji; biblioteka UI (np. Tamagui) — plan zakłada własne
  komponenty w stylu SkinSort.

### Świadomie odłożone ze Sprintu 0

- Wdrożenie stagingu (Render + Supabase) — robi Oleksandr ręcznie, gdy będzie co pokazać.
- Seed z danymi Sa.Sha, import 42 produktów z Hebe, słowniki `skin_concerns` / `ingredient_groups`.
- Font Inter, komponenty bazowe (sekcja 7.4), TanStack Query, Zustand, secure-store, klient orval —
  dojdą razem z pierwszym ekranem, który ich używa (Sprint 1).
