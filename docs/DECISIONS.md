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

---

## Sprint 1 (14.10.2026)

### D-15. Tokeny: krótki JWT + losowy refresh token z rotacją

- **Decyzja:** access token to JWT (HS256, 15 min) z `sub`, `guest` i `role`. Refresh token to losowe
  48 bajtów, ważne 30 dni; w bazie trzymamy tylko jego skrót SHA-256. Każde odświeżenie unieważnia stary
  token i wydaje nową parę. Jeśli ktoś użyje tokenu, który już był użyty, uznajemy go za wykradziony
  i wylogowujemy wszystkie sesje tego użytkownika.
- **Dlaczego:** wyciek bazy nie daje działających tokenów, a skradziony refresh token działa najwyżej
  do pierwszego użycia przez właściciela. Unieważnienie jest „atomowe” (`UPDATE … WHERE revoked_at IS
  NULL`), więc dwa równoległe żądania nie dostaną dwóch nowych par.
- **Alternatywy:** refresh token jako JWT (nie da się go odwołać bez czarnej listy), sesja w ciasteczku
  (niewygodna w aplikacji mobilnej), Passport.js (dodatkowa warstwa bez korzyści przy dwóch strategiach).

### D-16. Konto gościa dopiero w O22 i „Kontynuuj bez konta”

- **Decyzja:** odpowiedzi z quizu leżą na telefonie (Zustand + AsyncStorage) aż do O22. Tam użytkownik
  zakłada konto e-mail albo wybiera „Kontynuuj bez konta” — wtedy tworzymy konto gościa
  (`POST /v1/auth/guest`). Rejestracja z tokenem gościa zamienia to samo konto w zwykłe, więc dane
  zostają (Profil → „Zapisz profil na koncie”).
- **Dlaczego:** plan (3.4) zakładał gościa od początku quizu, ale wtedy każdy, kto porzuci quiz,
  zostawiałby pusty rekord w bazie. Przy odpowiedziach trzymanych lokalnie konto przed O22 nic nie daje.
  Opcja bez konta jest też potrzebna, dopóki Apple i Google nie działają, a App Store nie lubi
  wymuszania konta, gdy aplikacja może działać bez niego.
- **Alternatywy:** gość tworzony przy O6 (więcej śmieci w bazie), konto obowiązkowe (gorsza konwersja).

### D-17. Apple i Google: endpointy są, weryfikacja później

- **Decyzja:** `POST /v1/auth/apple` i `/v1/auth/google` przyjmują token i odpowiadają 501 z opisem
  TODO. W aplikacji przyciski są, ale pokazują komunikat „już niedługo”.
- **Dlaczego:** weryfikacja wymaga identyfikatorów z kont Apple Developer i Google Cloud, których
  jeszcze nie ma. Kontrakt API jest gotowy, więc później zmienia się tylko serwis.

### D-18. Reset hasła jako zaślepka

- **Decyzja:** `POST /v1/auth/password/reset` zawsze odpowiada 202, bez względu na to, czy e-mail
  istnieje; na razie tylko loguje identyfikator użytkownika.
- **Dlaczego:** nie wybraliśmy jeszcze dostawcy e-maili (Sprint 6). Jednakowa odpowiedź nie zdradza,
  które adresy mają konto.

### D-19. Typ skóry liczy `packages/scoring`, serwer liczy go jeszcze raz

- **Decyzja:** reguły z sekcji 6.1 są w `packages/scoring/src/quiz.ts`. Aplikacja używa ich do ekranu
  wyniku O14 (bez internetu), a serwer przy `PUT /v1/me/quiz` liczy wszystko ponownie z surowych
  odpowiedzi. Klient nie może przysłać gotowego `skinType` — walidacja odrzuca nieznane pola.
- **Doprecyzowania reguł:** skórę mieszaną sprawdzamy przed progami sumy (inaczej błyszcząca strefa T
  zawsze dawałaby „tłustą”); suma punktów jest obcinana do −3…+3; O9 wpływa tylko na sebum (tak jak
  we wzorze w planie); `is_sensitive` = wrażliwość ≥ 2. Progi i tak przejdą kalibrację (4.5).
- **Dlaczego:** jeden kod, jedne testy (100% pokrycia), ten sam wynik w aplikacji i w bazie.

### D-20. Słowniki problemów i grup w migracji

- **Decyzja:** `skin_concerns` (11 kodów z O7 + `dryness`, `sensitivity`) i `ingredient_groups`
  (7 grup z O15) są wstawiane drugą migracją. Kody z 3.2, które dublują O7 (`acne`,
  `hyperpigmentation`, `aging`), pominęliśmy.
- **Dlaczego:** bez tych wierszy nie da się zapisać quizu, więc muszą istnieć w każdym środowisku —
  także na pustej bazie testowej — a nie dopiero po uruchomieniu seeda.

### D-21. Unikane składniki (O16) jako nazwy INCI

- **Decyzja:** aplikacja wysyła nazwy INCI (wielkimi literami). Serwer łączy je z katalogiem po
  `inci_name` albo przez `ingredient_aliases`; nieznane nazwy zostają w `quiz_answers`. Lista „Często
  unikane” jest na razie stała w aplikacji.
- **Dlaczego:** katalog składników będzie dopiero w Sprincie 2. Dzięki temu wybory z quizu nie giną —
  po imporcie można je dopasować ponownie.

### D-22. Klient API: openapi-typescript + openapi-fetch zamiast orval

- **Decyzja:** serwer zapisuje dokument OpenAPI do `packages/api-client/openapi.json` (bez bazy
  i bez uruchamiania serwera), a `openapi-typescript` generuje z niego typy. Aplikacja woła API przez
  `openapi-fetch`, który sprawdza ścieżki, parametry i odpowiedzi według tych typów. CI regeneruje
  klienta i przerywa build, jeśli różni się od tego w repozytorium.
- **Dlaczego:** spełnia zasadę z 8.2 (żadnych ręcznie pisanych typów odpowiedzi), a jest lżejsze niż
  orval: jedna funkcja `fetch` z obsługą odświeżania tokenu zamiast generowanych hooków.
- **Alternatywy:** orval (generuje hooki TanStack Query; dodamy, jeśli zacznie nam ich brakować).

### D-23. Gdzie aplikacja trzyma dane

- **Decyzja:** tokeny w `expo-secure-store` (Keychain / Keystore), odpowiedzi quizu w AsyncStorage,
  dane z serwera w cache TanStack Query. Odświeżanie tokenu jest „pojedyncze”: równoległe żądania
  czekają na jedno odświeżenie.
- **Dlaczego:** refresh token jest jednorazowy (D-15) — dwa równoległe odświeżenia wyglądałyby dla
  serwera jak kradzież i wylogowały użytkownika. Odpowiedzi quizu nie są sekretem, a nieudane wysłanie
  ponawiamy przy następnym starcie aplikacji.

### D-24. Testy e2e na prawdziwej bazie

- **Decyzja:** `pnpm --filter @dermamind/api test:e2e` tworzy osobną bazę `dermamind_test`, nakłada
  migracje i przed każdym testem czyści dane użytkowników. Testują m.in. rotację i kradzież tokenu,
  ulepszenie gościa, walidację quizu i usunięcie konta ze wszystkimi danymi. Jest uruchamiany
  z `--experimental-vm-modules`, bo Prisma 7 ładuje swój kompilator zapytań jako moduł WASM.
- **Dlaczego:** atrapy nie złapałyby błędów w kaskadowym usuwaniu ani w unikalności e-maili.
  Osobna baza nie niszczy danych deweloperskich.

### D-25. Zabezpieczenia API

- **Decyzja:** globalna walidacja DTO (`whitelist` + `forbidNonWhitelisted`), `helmet`, limit
  20 żądań/min na IP dla `/v1/auth/*` (`AUTH_RATE_LIMIT`), argon2id do haseł, przy nieznanym e-mailu
  sprawdzamy hasło z atrapą hasha, żeby czas odpowiedzi nie zdradzał, czy konto istnieje.
- **Dlaczego:** wymagania z 3.4; logowanie jest najczęstszym celem ataków słownikowych.

### D-26. Nawigacja i ekrany quizu

- **Decyzja:** `Stack.Protected` z Expo Router: niezalogowany widzi tylko onboarding, zalogowany tylko
  zakładki. Ekrany O2–O22 to jedna trasa `/onboarding/[step]` i lista kroków w `steps.ts`; pasek
  postępu liczy się z pozycji na liście. Font Inter wczytujemy już teraz; animacja O20 używa
  wbudowanego `Animated` (Reanimated usunęliśmy, bo nic go nie potrzebuje).
- **Dlaczego:** kolejność kroków jest w jednym miejscu — dodanie lub przestawienie pytania nie wymaga
  zmian w kilku plikach.

### Świadomie odłożone ze Sprintu 1

- Prawdziwe logowanie Apple / Google (po założeniu kont deweloperskich — decyzja Oleksandra).
- Wysyłka e-maila z resetem hasła (Sprint 6), wyszukiwarka składników w O16 i produktów w O21
  (Sprint 2), skaner (Sprint 3), edycja profilu skóry D6.

---

## Sprint 2 (14.10.2026)

### D-27. Pełny skład INCI — po co i dlaczego uzupełniamy go ręcznie

- **Decyzja:** potrzebujemy pełnych składów, ale w bazie Sa.Shy jest tylko 4–9 kluczowych składników
  na produkt (z prawdziwą pozycją w składzie). Pełne składy wpisujemy ręcznie do `data/inci_full.json`
  ze stron produktów, a import (`pnpm import:catalog`) za każdym razem bierze to, co już jest. Do tego
  czasu produkt ma `inci_complete = false`.
- **Dlaczego pełny skład:** bez niego nie da się uczciwie powiedzieć „bez zapachów” czy „bez silikonów”
  — brak składnika na liście kluczowych nie znaczy, że go nie ma. Unikane składniki (np. Limonene) też
  zwykle są poza „kluczowymi”. Algorytm i tak działa na kluczowych, ale oznacza wynik jako niepewny.
- **Dlaczego nie automatycznie:** plan zakładał jednorazowe pobranie 42 stron z hebe.pl, ale ich
  `robots.txt` zabrania wstępu agentowi `ClaudeBot` (i innym botom AI) na całej domenie. To samo robi
  Open Beauty Facts. Uszanowaliśmy to: nie pobieramy tych stron, a składów nie zgadujemy.
- **Alternatywy:** skrypt-scraper uruchamiany przez nas (to samo obejście zakazu), zgadywanie składu
  z nazw (niedopuszczalne w aplikacji o składnikach), zakup danych (poza budżetem).

### D-28. Słownik składników w kodzie

- **Decyzja:** `scripts/catalog/dictionary.ts` trzyma kanoniczne nazwy INCI, aliasy (angielskie i polskie,
  np. „Shea Butter” i „Masło shea” → BUTYROSPERMUM PARKII BUTTER, „Olej kokosowy” → COCOS NUCIFERA OIL),
  funkcje i flagi. Flagi wpisujemy tylko tam, gdzie wynikają z samej nazwy (26 alergenów zapachowych UE,
  parabeny, siarczany, silikony, oleje…), komedogenność tylko według popularnych tabel opartych na
  Fulton (1989), resztę zostawiamy pustą.
- **Klucz aliasu:** małe litery, tylko litery i cyfry (`aliasKey` w `@dermamind/scoring`), więc
  „Alcohol Denat.”, „ALCOHOL DENAT” i „alcohol-denat” trafiają w ten sam składnik.
- **Dlaczego w kodzie:** zmiany przechodzą przez review w PR i mają historię; import nadpisuje bazę.
  Przed obroną słownik sprawdza kosmetolog (4.5).
- **Alternatywy:** CosIng jako pełne źródło funkcji — dobry kierunek na Sprint 6, ale wymaga osobnego
  importu i licencji.

### D-29. Jak mapujemy bazę Sa.Shy

- **Decyzja:** `good` / `bad` z `ingredient_effects` → wpływ +1 / −1 (skala planu to −2…+2, a Sa.Sha nie
  rozróżniała siły). Problemy: `acne` → `breakouts`, `oily_skin` → `oiliness`, `dry_skin` → `dryness`,
  `sensitive_skin` → `sensitivity`, `dehydrated_skin` → `hydration`, `redness` → `redness`,
  `barrier_damage` → nowy kod `barrier`. Kategorie: `cream` → `moisturizer`, `spf` → `sunscreen`,
  `micellar_water` → `cleanser`. Z nazw usuwamy powtórzoną markę („Bielenda Hydro…” → „Hydro…”).
  Testowych użytkowników z tej bazy nie importujemy.
- **Dlaczego:** zachowujemy całą wiedzę Sa.Shy bez dopisywania siły efektu, której nikt nie ocenił.

### D-30. Import jako idempotentny skrypt w osobnym pakiecie

- **Decyzja:** pakiet `scripts` w monorepo (`tsx`), upsert po naturalnych kluczach (`inci_name`, alias,
  nazwa marki, `source_url`), skład produktu wymieniany w całości. Czysta część (`buildCatalog`) ma testy
  bez bazy. Każde uruchomienie zapisuje `data/import-report.md` i odświeża `data/inci_missing.md`.
  CI uruchamia import dwa razy na czystej bazie.
- **Dlaczego:** pełne składy będą dochodzić partiami — import musi dać się powtarzać bez duplikatów.
- **Alternatywy:** jeden plik SQL (trudno go aktualizować), seed Prismy (miesza dane testowe z katalogiem).

### D-31. Match Score — doprecyzowania do sekcji 4

- **Decyzja:** algorytm jest w `packages/scoring/src/match.ts`, wszystkie wagi w jednym obiekcie
  `WEIGHTS`. Doprecyzowania:
  - zbiór problemów C uzupełniamy o `sensitivity` (skóra wrażliwa, priorytet 2) i `barrier` (bariera
    osłabiona — priorytet 2, nadwerężona — 1); bez tego efekty Sa.Shy dla skóry wrażliwej i bariery nic
    by nie znaczyły;
  - przy kilku źródłach tego samego problemu bierzemy najwyższą wagę;
  - „niepewny wynik” także wtedy, gdy znamy tylko kluczowe składniki;
  - każdy składnik dostaje ocenę (dobry / ostrożnie / zły / neutralny) do kolorowych kropli na liście.
- **Znane uproszczenie:** zapach u osoby wrażliwej liczy się dwa razy — jako efekt z bazy (−1 dla
  `sensitivity`) i jako kara z planu (−8 × waga). Zostawiamy to do kalibracji (4.5).
- **Testy:** 64 testy Vitest, 100% linii.

### D-32. „Co jest w środku” przy niepełnym składzie

- **Decyzja:** flaga jest „tak” tylko przy pełnym składzie. Przy niepełnym mówimy „nie”, gdy znany
  składnik ją łamie (np. Parfum → nie jest „bez zapachów”), a w pozostałych przypadkach „brak danych”.
  „Bez testów na zwierzętach” to cecha marki — dziś wszędzie „brak danych”.
- **Dlaczego:** fałszywe „✓ bez alergenów” jest gorsze niż jego brak.

### D-33. Unikane składniki dopasowujemy przy każdym zapytaniu

- **Decyzja:** przy liczeniu wyniku serwer łączy `avoided_ingredients` z nazwami z quizu dopasowanymi
  przez `inci_name` i aliasy.
- **Dlaczego:** użytkownik mógł wpisać „masło shea” zanim składnik trafił do katalogu. Dzięki temu po
  imporcie wykluczenie działa bez ponownego quizu. Koszt to jedno zapytanie.

### D-34. Lista produktów i wyszukiwanie

- **Decyzja:** `GET /v1/products` filtruje w SQL (prefiksowe wyszukiwanie po `tsvector` nazwy + marka +
  polskie słowa kategorii: „krem”, „tonik”, „pianka”…), a wynik liczy w pamięci dla wszystkich trafień,
  żeby dało się sortować po dopasowaniu. Domyślne sortowanie: po wyniku, gdy użytkownik ma profil.
  Katalog jest publiczny; z tokenem każdy produkt ma wynik.
- **Dlaczego:** przy setkach produktów to kilkanaście milisekund (4.4). Nazwy z bazy Sa.Shy są angielskie,
  więc bez słów kategorii „krem” nie znajdowałby niczego.
- **Alternatywy:** tabela `user_product_scores` odświeżana po zmianie profilu — gdy katalog urośnie.

### D-35. Ekrany Odkrywaj i karta produktu

- **Decyzja:** zamiast zdjęć (jeszcze ich nie mamy) piktogram kategorii na szarym tle. Pomijamy przyciski
  funkcji, których jeszcze nie ma (serduszko, „Dodaj do rutyny”, „Porównaj”, „Analizuj skład”, tekst AI),
  zamiast „Filtry” jest „Sortuj”. Skaner w wyszukiwarce mówi „już niedługo”. Link „Zobacz w sklepie Hebe”
  prowadzi do strony źródłowej.
- **Dlaczego:** martwe przyciski mylą użytkownika i testerów; dodamy je razem z funkcjami.

### Świadomie odłożone ze Sprintu 2

- Pełne składy 42 produktów (ręcznie, `data/inci_missing.md`).
- Uzupełnienie `ingredient_effects` dla 80 najczęstszych składników — to zadanie dla kosmetologa,
  nie dla kodu; dziś mamy 35 efektów z bazy Sa.Shy.
- Alternatywy na karcie produktu, zdjęcia produktów, filtr budżetu i `must_haves` w rankingu.

---

## Sprint 2 — pełne składy (14.10.2026)

### D-36. Skąd mamy pełne składy INCI i jak je sprawdzamy

- **Decyzja:** pełne składy 30 z 42 produktów zebrał asystent Claude (w czacie, na prośbę zespołu)
  z publicznych kart produktów w SkinSort (27) i Notino (3). Adres źródła każdego składu jest
  w `data/inci_full.json` (`inciSource`). Pozostałe 12 produktów zespół uzupełni ręcznie; do tego czasu
  mają tylko kluczowe składniki z bazy Sa.Shy.
- **Dlaczego nie Hebe:** dane Sa.Shy pochodzą z Hebe, ale `robots.txt` hebe.pl blokuje boty AI na całej
  domenie (D-27). SkinSort blokuje tylko `ClaudeBot` (zbieranie danych do trenowania), a narzędzia
  działające na prośbę użytkownika (`Claude-User`) wprost kieruje do ogólnych reguł, które karty
  produktów dopuszczają. Notino nie ma osobnych reguł dla AI. Zbieranie składów w czacie mieści się
  więc w zasadach obu stron.
- **Weryfikacja:** Sa.Sha zapisała prawdziwe pozycje kluczowych składników (z Hebe), więc każdy pełny
  skład porównujemy z nimi. Pole `inciNote` w `data/inci_full.json` to wynik takiego porównania
  zrobionego przez asystenta przy zbieraniu danych. Import robi je jeszcze raz sam i zapisuje wynik
  do `data/import-report.md`:
  - **zgodny** — wszystkie kluczowe składniki na tych samych pozycjach (7);
  - **przesunięty** — ta sama kolejność, przesunięcie o najwyżej 2 (lista w innym sklepie ma składnik
    więcej lub mniej przed kluczowymi) (11);
  - **rozbieżny** — składnika brak, inna kolejność albo większe przesunięcie (12). Najczęściej SKIN1004:
    według bazy Sa.Shy pierwszym składnikiem jest Centella Asiatica Extract, a w SkinSort woda — to
    wygląda na inną wersję receptury. Te produkty trzeba sprawdzić z opakowaniem.
  Oba porównania różnią się w kilku przypadkach (np. przesunięcie o 3 pozycje w `inciNote` uznane za
  zgodne), dlatego raport pokazuje oba.
- **Dlaczego importujemy także rozbieżne:** pełny skład z innej wersji receptury jest bliżej prawdy niż
  4–9 kluczowych składników. Raport mówi, co sprawdzić; po poprawce wystarczy ponowny import.
- **Słownik:** 275 nowych składników z tych list dopisaliśmy do `scripts/catalog/dictionary-extra.ts` —
  funkcje według CosIng, aliasy (także polskie: „Mocznik”, „Kwas traneksamowy”, „Olej z awokado”…)
  i flagi tylko tam, gdzie wynikają z nazwy: silikony, siarczany (Sodium Cetearyl Sulfate), oleje
  roślinne, olejki eteryczne jako zapachy (CosIng: *perfuming*), estry kwasów tłuszczowych C12–C22
  jako wyzwalacze trądziku grzybiczego (ta sama reguła co w D-28). Wpływów na problemy skóry ani
  komedogenności nie dopisywaliśmy — to wymaga kosmetologa.
- **Poprawki przy okazji:** parser dzielił „1,2-Hexanediol” (i „1, 2-Hexanediol” ze spacją) na dwa
  składniki; import usuwa teraz składniki z poprzednich przebiegów, których nic już nie używa.
- **Alternatywy:** brać tylko produkty zgodne lub przesunięte względem Sa.Shy (stracilibyśmy 12 składów), uznać jedno źródło
  za wzorzec bez porównania (nie wiedzielibyśmy o różnicach recept).

---

## Sprint 3 (14.10.2026)

### D-37. Kody EAN: plik do ręcznego uzupełnienia zamiast Open Beauty Facts

- **Decyzja:** kody kreskowe trzymamy w `data/barcodes.json` (`name`, `brand`, `url`, `ean`, `source`),
  a `pnpm import:catalog` przypisuje je produktom po adresie strony. Import przyjmuje tylko kody
  z poprawną cyfrą kontrolną i każdy kod tylko raz; resztę opisuje w raporcie. Dziś wszystkie pola
  `ean` są puste — uzupełnia je zespół z opakowań, w polu `source` wpisując skąd kod pochodzi.
- **Dlaczego nie Open Beauty Facts (plan, sprint 3):** `robots.txt` wszystkich hostów OBF — także
  `static.openbeautyfacts.org`, gdzie leżą eksporty zbiorcze — zabrania wstępu agentom `anthropic-ai`,
  `ClaudeBot` i `Claude-Web`. Asystent więc ani nie pobierał eksportu, ani nie pytał API. Kodów nie
  zgadujemy: zły EAN pokazałby skład innego produktu.
- **Jeśli zespół sam pobierze eksport OBF:** dane są na licencji ODbL. Trzeba wtedy wpisać źródło
  w `source` (np. `openbeautyfacts.org`), dodać w aplikacji i w pracy dopisek „Zawiera dane z Open
  Beauty Facts (openbeautyfacts.org), dostępne na licencji Open Database License (ODbL)” i pamiętać,
  że baza z nich wyprowadzona też musi być udostępniona na ODbL.
- **Alternatywy:** API OBF na żywo w aplikacji (zależność od zewnętrznej usługi przy każdym skanie),
  generowanie kodów z nazw (niemożliwe — EAN nadaje producent).

### D-38. Skaner i historia skanów

- **Decyzja:** `GET /v1/products/barcode/:ean` przyjmuje EAN-13 i EAN-8 z poprawną cyfrą kontrolną
  (UPC-A zamieniamy na EAN-13, tak jak robi to iOS). Każdy skan zalogowanego użytkownika trafia do
  `scan_history`, także nieznany kod (`product_id = null`); bez konta nic nie zapisujemy.
  `GET /v1/me/scans` pokazuje historię od najnowszych. W aplikacji skaner (`expo-camera`) reaguje na
  pierwszy poprawny kod, blokuje kolejne odczyty, daje wibrację i przechodzi do karty produktu albo do
  ekranu „Nie znamy jeszcze tego produktu”.
- **Dlaczego zapisujemy nieznane kody:** to lista produktów, których ludzie naprawdę szukają —
  podpowiada zespołowi, co dodać do bazy najpierw.
- **Uprawnienie do aparatu:** polski tekst w `app.config.ts` (plugin `expo-camera`, bez mikrofonu).
  W Expo Go system pokazuje tekst Expo Go, nasz pojawi się w buildach EAS.

### D-39. Analiza wklejonego składu (D3)

- **Decyzja:** `POST /v1/analyze/inci` używa tego samego parsera, dopasowania aliasów i Match Score co
  katalog. Nazwa jest dopasowywana po pełnej formie, bez nawiasów i po tym, co w nawiasach („Water
  (Aqua)” → AQUA), także po polsku („Gliceryna”, „Olej kokosowy”). Ten sam składnik pod dwiema nazwami
  liczy się raz. Nierozpoznane nazwy wracają w liście `unknown` i obniżają pewność wyniku; flagi
  „bez X” są wtedy „brak danych”. Tekstu nie zapisujemy.
- **Parser** obsługuje teraz także listę po jednej nazwie w wierszu, „Skład (INCI):”, „Może zawierać”,
  przypisy z gwiazdką i „1, 2-Hexanediol”; przypadki brzegowe mają testy.
- **Dlaczego bez zapisu:** wklejony tekst może być czymkolwiek; zgłoszenie produktu jest osobnym,
  świadomym krokiem.
- **Alternatywy:** parser AI (plan 5) — zostaje jako zapas w Sprincie 4 dla list, których reguły nie
  rozpoznają.

### D-40. Karta składnika (D2)

- **Decyzja:** `GET /v1/ingredients/:id` zwraca funkcje, flagi, wpływy na problemy skóry, do 10
  produktów z tym składnikiem i część „Dla Twojej skóry”, liczoną funkcją `ingredientForProfile`
  w `@dermamind/scoring` (te same reguły co Match Score, bez wagi pozycji). Tekst AI dojdzie
  w Sprincie 4.
- **Dlaczego w pakiecie scoring:** „pomaga na / może nasilać / uwaga” musi się zgadzać z tym, co widać
  w wyniku produktu.

### D-41. Zgłoszenia produktów

- **Decyzja:** `POST /v1/product-submissions` (w planie `/submissions` — nazwa jaśniejsza w Swaggerze)
  wymaga konta (wystarczy gość), ma limit zapytań i waliduje EAN. Po usunięciu konta zgłoszenie
  zostaje, ale bez autora (`user_id = null`). Zdjęcie opakowania — później, gdy wybierzemy magazyn
  plików.
- **Dlaczego konto:** łatwiej odsiać spam i odpowiedzieć autorowi, a gość powstaje jednym kliknięciem.
