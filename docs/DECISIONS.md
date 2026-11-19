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

---

## Sprint 4 (14.10.2026)

### D-42. AI tylko objaśnia — wynik zawsze z reguł

- **Decyzja:** moduł `ai` serwera ma trzy funkcje: opis składnika (`ai-ingredient-explain`),
  „Dlaczego taki wynik” (`ai-product-summary`) i zapasowy parser składu (`ai-parse-inci`). Model
  dostaje gotowy wynik z `@dermamind/scoring` i dane z bazy; prompt systemowy zabrania podawania lub
  zmiany liczb, polecania produktów spoza danych, porad medycznych i diagnoz. Dane trafiają do promptu
  w znacznikach `<data>` jako JSON, a prompt każe traktować je jako dane, nie polecenia — wklejony
  skład może zawierać cokolwiek.
- **Dlaczego:** ten sam produkt i profil zawsze dają ten sam wynik, a AI nie może go „zmyślić” (plan 2).
- **Prompty** są w `apps/api/src/ai/prompts/*.ts` ze stałą `PROMPT_VERSION`; piszemy je po angielsku,
  a język odpowiedzi (pl / en / uk) jest parametrem.

### D-43. Modele i ustawienia

- **Decyzja:** `AI_MODEL_FAST=claude-haiku-5-5` dla opisów składników i parsera, `AI_MODEL_SMART=
  claude-sonnet-5-5` dla „Dlaczego taki wynik”. Identyfikatory sprawdzone w dokumentacji Anthropic
  (14.10.2026), w `.env.example`, nie w kodzie. Wysiłek modelu `low` — to krótkie teksty, nie zadania
  wymagające długiego rozumowania.
- **Dlaczego mocniejszy model do wyniku:** tekst jest osobisty (profil × produkt) i musi wiernie oddać
  powody; opis składnika jest ogólny i liczony raz dla wszystkich.

### D-44. Odpowiedź strukturalna: narzędzie + Zod + jedna ponowna próba

- **Decyzja:** każda funkcja ma jedno narzędzie z `strict: true` i schematem bez dodatkowych pól;
  odpowiedź z wywołania narzędzia sprawdza Zod. `tool_choice` jest `auto`, a prompt każe wywołać
  narzędzie — najnowsze modele (m.in. Sonnet 5.5) odrzucają wymuszone `tool_choice` błędem 400.
  Jedna ponowna próba przy braku lub złej odpowiedzi, błędzie sieci, 429 i 5xx; bez ponawiania przy
  4xx i odmowie. Potem stały tekst zastępczy (pl / en / uk). SDK ma wyłączone własne ponawianie,
  limit czasu 20 s na próbę (najwyżej ok. 40 s na żądanie).
- **Odmowa modelu:** dla Sonnet 5.5 włączamy serwerowy fallback (`fallbacks: "default"`, beta
  `server-side-fallback-2026-07-01`) — przy odmowie z powodów bezpieczeństwa API samo powtarza
  zapytanie na innym modelu. Haiku 5.5 tego nie ma; wtedy pokazujemy tekst zastępczy.
- **Alternatywy:** wolny tekst + wyrażenia regularne (kruche), `output_config.format` (równie dobre;
  wybraliśmy narzędzie, bo tak opisuje to plan 5.1).

### D-45. Cache i limit

- **Decyzja:** klucz `ai_cache` = SHA-256 z (wersja promptu, funkcja, język, model, dokładne dane
  wejściowe). Opis składnika nie zawiera danych użytkownika, więc jest wspólny dla wszystkich
  (składnik × język); „Dlaczego” zależy od profilu i wyniku (produkt × profil × język) — zmiana wyniku
  po imporcie daje nowy wpis. Zapisujemy tylko udane odpowiedzi. Limit 30 wywołań modelu na
  użytkownika dziennie (strefa Europe/Warsaw) w tabeli `ai_usage`, liczony atomowym `INSERT … ON
  CONFLICT`; trafienia w cache są za darmo. Endpointy wymagają konta (gość wystarczy).
- **Prompt caching Anthropic** — nie używamy: prompt systemowy jest krótszy niż minimalny fragment,
  który API cache'uje, więc nic by to nie dało. Nasz `ai_cache` oszczędza więcej, bo całe odpowiedzi.

### D-46. Prywatność i działanie bez klucza

- **Decyzja:** do API trafia tylko typ skóry, wrażliwość, stan bariery, problemy, grupy unikania
  i nazwy wykluczonych składników z danego produktu — bez e-maila, imienia i identyfikatora (test e2e
  to sprawdza). Bez `ANTHROPIC_API_KEY` endpointy zwracają tekst zastępczy, a reszta aplikacji działa
  bez zmian. Klucz czyta tylko `config.ts`, nigdy nie trafia do logów (logujemy nazwę błędu i status).
- **Testy:** klient Claude jest wstrzykiwany (`AI_TRANSPORT`) i w testach zawsze podmieniony — `null`
  albo atrapa; `test/env.ts` dodatkowo czyści klucz, więc ani testy, ani CI nie wołają prawdziwego API.

### D-47. Parser AI jako zapas

- **Decyzja:** `/v1/analyze/inci` pyta AI o odczytanie listy tylko wtedy, gdy reguły nie rozpoznały
  ponad 30% nazw, tylko dla zalogowanych (limit) i bierze wynik AI tylko, gdy rozpoznaje więcej
  składników. AI zwraca same nazwy — dopasowanie i ocena zostają regułowe; odpowiedź ma pole
  `parsedBy`, a aplikacja mówi wtedy, że skład odczytało AI.

### D-48. AI w aplikacji

- **Decyzja:** „Dlaczego taki wynik?” na karcie produktu i „Co to jest” na karcie składnika ładują się
  osobno od karty (szkielet podczas ładowania). Tekst z AI ma dopisek „Opis wygenerowany przez AI · nie
  jest poradą medyczną”; tekst zastępczy z serwera jest bez dopisku. Błąd sieci przy tekście AI nic nie
  pokazuje — ekran jest kompletny bez niego.

### D-49. Diagnostyka AI i teksty zastępcze w aplikacji

- **Kontekst:** na telefonie oba teksty AI pokazywały tekst zastępczy mimo ustawionego klucza. Przyczyna:
  brak środków na koncie Anthropic (API odpowiadało `400 invalid_request_error` „credit balance is too
  low”), a nie kod czy identyfikatory modeli.
- **Decyzja:** `pnpm ai:check` robi po jednym minimalnym wywołaniu na model tym samym transportem co
  moduł `ai`, sprawdza modele przez Models API i wypisuje typ błędu, status i request-id — nigdy klucza.
  Log serwera pokazuje teraz także powód błędu z API. Teksty zastępcze nigdy nie trafiają do `ai_cache`
  (zapisujemy tylko udane odpowiedzi — jest na to test), a aplikacja nie trzyma ich w swoim cache, więc
  po naprawie właściwy tekst pojawia się przy następnym otwarciu ekranu.

---

## Sprint 5 (15.10.2026)

### D-50. Konflikty składników — mały, ostrożny zestaw

- **Decyzja:** `ingredient_conflicts` wypełnia import z reguł w `scripts/catalog/conflicts.ts` (30 par):
  - retinoidy (Retinol, Retinal, Retinyl Palmitate, Hydroxypinacolone Retinoate) × AHA (glikolowy,
    mlekowy, migdałowy) / BHA (salicylowy) — **2, nie łączyć**: oba działają złuszczająco i drażniąco,
    razem częściej dają podrażnienie i osłabienie bariery;
  - retinoidy × nadtlenek benzoilu — **2**: nadtlenek utlenia część retinoidów (opisane dla tretynoiny)
    i oba mocno wysuszają;
  - witamina C (tylko L-Ascorbic Acid, nie łagodniejsze pochodne) × AHA/BHA — **1, uwaga**: kwas
    askorbinowy działa przy niskim pH, z kwasami złuszczającymi częściej szczypie i podrażnia;
  - AHA × inne AHA/BHA — **1**: podwójne złuszczanie.
  Kwas cytrynowy (zwykle regulator pH) i PHA (glukonolakton, kwas laktobionowy) świadomie pominięte.
- **Jak liczymy:** konflikt to para składników w **różnych** produktach tej samej pory dnia (w jednym
  produkcie odpowiada za to formulacja). Liczą się tylko składniki do 15. pozycji w składzie —
  ostrożne przybliżenie „stężenia aktywnego”; wolimy przeoczyć słaby przypadek niż straszyć fałszywym.
- **Źródła (do sprawdzenia z kosmetologiem i uzupełnienia o dokładne dane bibliograficzne przed
  obroną):** zalecenia American Academy of Dermatology dotyczące retinoidów i bezpiecznego złuszczania
  w domu; Martin B. i in., stabilność adapalenu i tretynoiny z nadtlenkiem benzoilu, Br J Dermatol
  1998; Pinnell S. R. i in., wchłanianie miejscowego kwasu L-askorbinowego a pH, Dermatol Surg 2001.
  Teksty dla użytkownika (po polsku) są w aplikacji pod kluczami `note_key`.
- **Alternatywy:** szeroka lista „mitów o łączeniu” z internetu — zbyt wiele fałszywych alarmów.

### D-51. Rutyna i jej wynik

- **Decyzja:** jedna rutyna na porę dnia (`UNIQUE (user_id, time_of_day)`), stałe kroki: rano
  oczyszczanie, tonizowanie, serum, nawilżanie, SPF; wieczorem bez SPF. Każdy krok przyjmuje tylko
  pasujące kategorie (`STEP_CATEGORIES` w `@dermamind/scoring`, np. SPF tylko `sunscreen`), jeden
  produkt w jednym kroku. Wynik rutyny = średnia Match Score produktów − 10 za każdy konflikt − 10,
  gdy rano są produkty, ale nie ma filtra (plan 4). Liczy to `computeRoutineScore` (testy Vitest).
- **Dlaczego stałe kroki:** prosty model danych i interfejsu (numerowane sloty z makiety), a generator
  ma jasne miejsce na każdy produkt. Własne kroki — po MVP.

### D-52. Generator rutyny

- **Decyzja:** `POST /v1/me/routines/generate` (plan 5.2): kandydaci z reguł — pasująca kategoria,
  bez wykluczeń i bez półki „Unikam”, wynik ≥ 50, top 3 na krok. Gdy AI jest dostępne, `ai-routine`
  (model SMART) wybiera po jednym produkcie i pisze wyjaśnienie; wybór jest odrzucany, jeśli
  zawiera produkt spoza kandydatów, pomija krok z kandydatami, używa produktu dwa razy w jednej porze
  albo tworzy konflikt. Wtedy — i zawsze bez klucza / bez środków / po limicie — działa wybór regułowy:
  w każdym kroku najlepszy kandydat, który nie dokłada konfliktu (jeśli każdy dokłada — najlepszy,
  a konflikt widać w wyniku). Tekst do rutyny regułowej i formułka o konsultacji z dermatologiem są
  stałe, z aplikacji, nie z modelu. Odpowiedź mówi, kto ułożył rutynę i dlaczego nie AI
  (`fallbackReason`). Ręczna zmiana później czyści znacznik „wygenerowana” i opis.
- **Dlaczego „najlepszy bez konfliktu” zamiast czystego top 1:** plan mówi „top 1 z SQL”, ale top 1
  potrafi sam stworzyć konflikt (retinol + tonik z kwasem), a aplikacja nie powinna go proponować.

### D-53. Półki

- **Decyzja:** `GET/POST/DELETE /v1/me/shelves` dla trzech półek systemowych (Mam, Lubię, Unikam),
  tworzonych przy rejestracji i odtwarzanych, gdyby ich brakowało. „Lubię” i „Unikam” wykluczają się
  nawzajem. Produkt z „Unikam” jest traktowany jak produkt z unikanym składnikiem: status „Nie pasuje”,
  wynik ≤ 40, nie trafia do kandydatów rutyny; karta produktu mówi dlaczego (`avoidedByUser`).
  Własne półki — po MVP.

### D-54. Dziś: samopoczucie skóry i odhaczanie rutyny

- **Decyzja:** `GET /v1/me/today`, `PUT /v1/me/today/mood` (1–5) i `PUT /v1/me/today/routine/:time`
  (pozycje zrobionych kroków). „Dziś” to data w strefie Europe/Warsaw, niezależnie od strefy serwera.
  Tydzień pon.–niedz. z zaznaczonymi dniami, w których zapisano samopoczucie. Aplikacja pokazuje rano
  (do 15:00) poranną, potem wieczorną rutynę.

### D-55. Ekrany Dziś, Rutyna, Półka i przyciski na karcie produktu

- **Decyzja:** T1, T3 i T4 według makiet 05 i 08; wszystko działa bez AI (rutyna z reguł i stały
  tekst). Na karcie produktu „Dodaj do rutyny” sam dobiera krok po kategorii i pyta tylko o porę dnia
  (i o zastąpienie zajętego slotu); zakładka w nagłówku i przycisk „Na półkę” przełączają półki.
  Usuwanie z rutyny i półki — długim przytrzymaniem z potwierdzeniem.

---

## Utrzymanie (05.11.2026)

### D-56. Aktualizacja do Expo SDK 58

- **Decyzja:** aplikacja przechodzi z Expo SDK 57 na SDK 58 (React Native 0.88, React 19.3, Expo
  Router 58). Wersje bibliotek natywnych wyrównało `npx expo install expo@^58.0.0 --fix`,
  `expo-doctor` nie zgłasza problemów.
- **Dlaczego teraz:** nowe Expo Go ze sklepów obsługuje tylko SDK 58, więc projekt na SDK 57 przestał
  się otwierać na telefonach zespołu. Bez aktualizacji testowanie wymagałoby własnego buildu
  deweloperskiego (EAS) na każdym telefonie.
- **Co zmieniliśmy w kodzie:** RN 0.88 domyślnie używa ścisłych typów TypeScript — `TextField`
  przyjmuje teraz `ref` jako zwykły prop (React 19) z typem `TextInputInstance` zamiast `forwardRef`.
  Minimalny Node w `engines` podniesiony do 22.13 (wymóg SDK 58). Usunięte w RN 0.88 API
  (`InteractionManager`, `Touchable`, `Modal animated`, niektóre propsy `StatusBar`) nie były używane;
  dla `expo-camera` (skaner), `expo-secure-store`, `expo-font` i używanych przez nas funkcji Expo
  Router changelog nie wymienia zmian łamiących.
- **Do pamiętania później:** w buildach release na Androida R8 jest teraz domyślnie włączony (do
  sprawdzenia przy pierwszym buildzie EAS w Sprincie 7–8); w iOS prebuild tworzy `SceneDelegate`.
- **Alternatywy:** zostać na SDK 57 i robić development buildy przez EAS — wolniej dla zespołu
  i wbrew zasadzie „wdrożenia robi Oleksandr ręcznie”.

---

## Kody kreskowe z Open Beauty Facts i jasny motyw (19.11.2026)

### D-57. Baza kodów EAN z oficjalnego zrzutu Open Beauty Facts

- **Decyzja:** `pnpm catalog:import-obf` pobiera oficjalny eksport Open Beauty Facts
  (`openbeautyfacts-products.jsonl.gz`, ok. 100 MB) do `data/raw/` (poza gitem) i czyta go linia po
  linii (strumień gzip → readline), bez ładowania całego pliku do pamięci. Zostawiamy rekordy
  z poprawnym EAN-8/EAN-13 (suma kontrolna), niepustym składem i krajem UE w `countries_tags`;
  `is_polish_market` = jest `en:poland`. Nazwa i skład: najpierw wersja polska, potem angielska,
  potem główna. Upsert po EAN; pomijamy rekordy bez zmian (`last_modified_t`), więc ponowny import
  trwa sekundy. Raport: `data/obf-import-report.md`.
- **Wynik pierwszego importu:** 80 784 rekordów → 12 837 produktów (219 z rynku polskiego).
  Najwięcej odpada przez brak składu (54 935) i brak kraju UE (10 026).
- **Dlaczego:** to jedyne legalne, darmowe źródło kodów EAN ze składami. Scraping sklepów (Rossmann,
  Hebe, Apify) odrzuciliśmy: regulaminy i `robots.txt` tego zabraniają (patrz D-27 o Hebe).
- **Alternatywy:** API OBF produkt po produkcie (wolne, limity zapytań), ręczne wpisywanie kodów
  (nie skaluje się), płatne bazy GS1 (koszt, licencja).

### D-58. Źródło produktu: curated / obf / user — nasz katalog zawsze wygrywa

- **Decyzja:** `products.source` z tekstu staje się typem wyliczeniowym `curated | obf | user`
  (dotychczasowe wiersze → `curated`). Import OBF nigdy nie nadpisuje wiersza `curated` ani `user`;
  import katalogu curated ukrywa wiersz OBF z tym samym kodem (nie usuwa — może być na czyjejś półce).
  Unikalny indeks na `barcode` (EAN) już był; zostawiliśmy nazwę kolumny.
- **Dlaczego:** 42 produkty sprawdziliśmy ręcznie, dane OBF tworzy społeczność i bywają niepełne.
- **Alternatywy:** osobna tabela na produkty OBF — podwójne zapytania w każdym miejscu, gdzie
  liczymy wynik.

### D-59. Nierozpoznane składniki zapisujemy dosłownie, nie zgadujemy

- **Decyzja:** skład z OBF dzielimy tym samym parserem INCI co resztę (`splitInci`) i łączymy ze
  słownikiem po nazwie INCI i aliasach (`resolveInci` w `@dermamind/scoring`, wspólne dla importu,
  skanera i „Analizuj skład”). Nazwy, których nie znamy, trafiają do `products.inci_unknown`
  dokładnie tak, jak zostały wycięte z listy — bez dopasowania „najbliższej” nazwy. W wyniku
  dopasowania liczą się jak nieznane pozycje (tak jak w D3), więc obniżają pewność wyniku,
  a flagi „bez X” nie są obiecywane, dopóki choć jedna nazwa jest nieznana.
- **Dlaczego:** pomyłka w dopasowaniu (np. inny olej) dałaby fałszywie pewny wynik; uczciwie niższa
  pewność jest lepsza. Obecnie słownik rozpoznaje ok. 56% nazw z OBF — to mierzalny cel na Sprint 6.
- **Alternatywy:** tworzyć składnik dla każdej nieznanej nazwy (dziesiątki tysięcy śmieciowych
  wierszy w wielu językach), dopasowanie rozmyte (zgadywanie).

### D-60. Skaner: lokalna baza → API Open Beauty Facts → 404

- **Decyzja:** `GET /v1/products/by-ean/:ean` (zastępuje `/products/barcode/:ean`): najpierw własny
  produkt użytkownika z tym kodem, potem nasz katalog, potem API OBF (`/api/v2/product/:ean.json`,
  tylko potrzebne pola, User-Agent „DermaMind/1.0 (diploma project)”, limit 3 s). Wynik zapisujemy
  jako `source = obf`; kod, którego OBF nie zna, pamiętamy 24 h w `obf_misses`. Błąd sieci lub
  timeout nie jest zapamiętywany. Limity: ThrottlerGuard `scan` (30/min na klienta, `SCAN_RATE_LIMIT`)
  i 60 zapytań/min do OBF na cały serwer (OBF prosi o ≤ 100/min).
- **Dlaczego:** zrzut aktualizujemy rzadko, a ludzie skanują nowości; drugi skan tego samego kodu
  jest już lokalny i szybki. Zapamiętanie „nie ma” chroni OBF i nasz czas odpowiedzi.
- **Alternatywy:** tylko zrzut (nowe produkty nieznane do kolejnego importu), wywołanie OBF
  z aplikacji (sprzeczne z zasadą „aplikacja rozmawia tylko z naszym API”).

### D-61. Produkty dodane przez użytkownika są prywatne do moderacji

- **Decyzja:** gdy kodu nie ma albo OBF nie ma składu, aplikacja pokazuje formularz („Dodaj produkt”):
  nazwa, marka i zdjęcie z OBF są już wpisane, użytkownik wkleja skład. `POST /v1/products` zapisuje
  produkt z `source = user`, `needs_review = true`, `is_published = false`; widzi go tylko autor
  (skan, wyszukiwarka, półki, rutyna). Kod trafia do `user_barcode` z unikalnością (autor, kod),
  bo `barcode` jest unikalny w całym katalogu, a ten sam nieznany kod może dodać kilka osób.
  Zdjęcie bierzemy tylko z rekordu OBF tego samego kodu (nie z adresu podanego przez aplikację).
- **Dlaczego:** użytkownik dostaje wynik od razu, a do wspólnej bazy nic nie trafia bez sprawdzenia.
- **Alternatywy:** tylko zgłoszenie do kolejki (`product_submissions`) — użytkownik czeka na wynik;
  publikacja od razu — ryzyko spamu i błędnych składów.

### D-62. Przeglądanie pokazuje katalog curated, wyszukiwanie obejmuje OBF

- **Decyzja:** „Odkrywaj” bez wpisanego tekstu pokazuje nasz katalog (i własne produkty); wyszukiwanie
  obejmuje też ok. 13 tys. produktów OBF, ale ocenia najwyżej 300 kandydatów: najpierw curated, potem
  rynek polski, potem pełne składy. Karta składnika pokazuje do 200 produktów w tej samej kolejności.
  Generator rutyny bierze curated i tylko te produkty OBF, których cały skład znamy.
- **Dlaczego:** wynik liczymy w pamięci dla każdego kandydata (PLAN 4.4); bez limitu jedno zapytanie
  „krem” liczyłoby tysiące wyników. Kategorię OBF zgadujemy z `categories_tags` tylko dla jasnej
  pielęgnacji twarzy, reszta to „Inne” (szampony, pasty do zębów).
- **Alternatywy:** zapisane wyniki per użytkownik (przeliczanie po każdej zmianie profilu — za dużo
  pracy na ten etap), indeks wyszukiwania zewnętrzny (koszt, kolejna usługa).

### D-63. Atrybucja ODbL

- **Decyzja:** na karcie produktu z `source = obf` link „Dane: Open Beauty Facts (ODbL)” do strony
  produktu w OBF; w Profil → O aplikacji opis źródła z linkami do openbeautyfacts.org i licencji
  ODbL 1.0; raport importu zaczyna się od tej samej informacji. Bazę z danymi OBF traktujemy jako
  bazę pochodną — jeśli kiedyś ją udostępnimy, to na tej samej licencji.
- **Dlaczego:** ODbL wymaga widocznego przypisania źródła i zachowania licencji dla bazy pochodnej.

### D-64. Pełny jasny i ciemny motyw, wybór w Profil → Wygląd

- **Decyzja:** Systemowy / Jasny / Ciemny, w Zustand z zapisem w AsyncStorage (domyślnie Systemowy).
  `useTheme()` czyta wybór, a `Appearance.setColorScheme` przełącza też natywne elementy (alerty,
  klawiatura). Wszystkie kolory idą z tokenów; doszły tokeny dla nakładki aparatu (`camera`, `scrim`,
  `onScrim` — takie same w obu motywach, bo zawsze leżą na obrazie z kamery), treści na kolorowym
  tle (`onPrimary`, `onPrimaryDisabled`) i skali sebum (`scale1–5`).
- **Kontrast (WCAG AA):** wartości ze zrzutów SkinSort nie przechodziły dla tekstu w jasnym motywie,
  więc zmieniliśmy: `good` #1F9D55 → #157A40, `caution` #E07B12 → #9E5600, `bad` #D93636 → #BE2A2A,
  `textSecondary` #6E6E73 → #636368; w ciemnym `accent` #8C82F2 → #968DF4. Każdą parę tekst/tło
  sprawdza test `scripts/theme/contrast.test.ts` (4,5:1 dla tekstu, 3:1 dla ikon i dużych cyfr).
- **Alternatywy:** osobne tokeny „tekstowe” obok jaskrawych kolorów grafik — więcej tokenów i łatwo
  użyć złego; zostawić kolory ze zrzutów — pigułki 30–49% były nieczytelne (2,5:1).

---

## Słownik składników: z 56% do 90% rozpoznanych nazw (19.11.2026)

Postęp mierzymy jedną liczbą: jaki odsetek nazw z list INCI produktów Open Beauty Facts łączymy ze
słownikiem. Każdy krok zapisuje `pnpm catalog:relink --step …` w `data/recognition-history.json`;
tabela „przed i po” jest w `data/obf-import-report.md` i `data/ingredient-recognition.md`.

| Krok | Rozpoznane nazwy | Produkty w pełni rozpoznane |
| --- | ---: | ---: |
| Start (D-59) | 56,1% | 265 z 12 838 |
| 1. Taksonomia OBF (D-65) | 83,6% | 2 571 |
| 2. Załączniki CosIng II–VI (D-66) | 84,1% | 2 755 |
| 3. Normalizator + literówki (D-67, D-68) | 86,9% (w tym 1,1% rozmytych) | 3 474 |
| 4. Aliasy z przeglądu top-500 (D-69) | 90,5% (w tym 1,2% rozmytych) | 6 478 |

### D-65. Słownik z taksonomii składników Open Beauty Facts zamiast pełnego eksportu CosIng

- **Decyzja:** `pnpm catalog:import-obf-taxonomy` wczytuje `taxonomies/beauty/ingredients-cosing-obf.txt`
  z repozytorium openfoodfacts-server (ODbL): ok. 22 500 nazw INCI z numerem CosIng, CAS / EC,
  funkcjami, odwołaniami do załączników i nazwami w innych językach (z nich robimy aliasy).
  Nasze wpisy (curated) zachowują nazwę, funkcje i flagi — dopisujemy im tylko dane referencyjne.
  Alias, który dwie pozycje chcą przypisać różnym składnikom, pomijamy (87 przypadków).
- **Dlaczego:** Komisja nie udostępnia dziś całego inwentarza CosIng jako pliku (portal
  data.europa.eu go nie ma, strona CosIng eksportuje tylko załączniki). Wyszukiwarka CosIng ma
  wewnętrzne API z kluczem zaszytym w stronie — to byłby scraping, więc odpadło. Taksonomia OBF jest
  otwarta, zbudowana z CosIng i ma tę samą licencję co reszta danych OBF.
- **Na przyszłość:** `pnpm catalog:import-cosing` czyta każdy `data/raw/cosing/*.csv|xlsx` ze
  standardowymi kolumnami CosIng („INCI name”, „CAS No”, „Function”, …). Gdy dostaniemy pełny
  eksport, wystarczy go tam położyć — kod się nie zmienia.
- **Alternatywy:** API strony CosIng (scraping), ręczne przepisywanie (nierealne przy 30 tys. nazw).

### D-66. Załączniki II–VI z oficjalnego eksportu CSV CosIng

- **Decyzja:** te same pliki, które pobiera przycisk „CSV” na stronie CosIng
  (`…/cosing20/1.0/api/annexes/{II–VI}/export-csv`). Łączymy pozycje ze składnikami po nazwie INCI,
  aliasie albo numerze CAS i zapisujemy `annex_refs` oraz flagi `is_prohibited` (zał. II) i
  `is_restricted` (zał. III). Nazwy ze słownika wspólnych nazw z załączników III–VI, których nie
  mieliśmy, dodajemy jako składniki (264).
- **Dlaczego:** to jedyne dane CosIng udostępnione do pobrania; flagi pokazujemy na karcie
  składnika („Przepisy UE”). Na wynik dopasowania na razie nie wpływają — to informacja, nie ocena.

### D-67. Normalizator listy INCI

- **Decyzja:** przed podziałem listy: encje HTML (też uszkodzone, bez „;”), typograficzne myślniki
  i cudzysłowy, procenty, „Active / Inactive:”, prefiksy „Ingredients / Ingrédients / Inhaltsstoffe /
  Skład…” i bloki „may contain / peut contenir / kann enthalten / ±” w językach UE, lista rozdzielona
  „ - ”. Przy wyszukiwaniu: bez znaków diakrytycznych (Limonène = Limonene), pomyłki skanu w kodach
  barwników („CL 77891”, „C.I.”, „C1”) i „HCI” → HCl, nazwy pisane na dwa sposoby („CI 77891 /
  Titanium Dioxide”, „Aqua/Water/Eau”) — części próbujemy tylko, gdy cała nazwa jest nieznana, bo
  prawdziwe nazwy INCI też mają ukośnik.
- **Zmiana klucza aliasu** (bez diakrytyków) wymagała przepisania kluczy w bazie — robi to
  `catalog:relink` (2001 kluczy przepisanych, 473 scalonych).

### D-68. Literówki: wysoki próg, oznaczenie „niepewne”, nigdy po cichu

- **Decyzja:** dopasowanie rozmyte tylko gdy nic innego nie pasuje i tylko o jedną zmianę
  (wstawienie, usunięcie, zamiana albo przestawienie liter), nie w pierwszych trzech znakach (poza
  pomyłkami skanu l / I / 1, O / 0), nie obok cyfry, w nazwach krótszych niż 10 znaków bez zamiany
  litery, i tylko gdy najbliższy jest dokładnie jeden składnik. Takie powiązanie ma
  `match = fuzzy` i `matched_from`; aplikacja pisze „Na etykiecie: „…” — rozpoznane mimo literówki,
  niepewne”, a w Match Score liczy się jak nieznany składnik (obniża pewność), choć jego cechy
  (np. unikany składnik) nadal działają — lepiej ostrzec niż przemilczeć.
- **Dlaczego tak ostro:** pierwsza wersja (do 2 zmian) w przeglądzie myliła substancje: MALVA →
  MALUS (malwa → jabłoń), CITRUS PARADISI PEEL → SEED OIL, HYDROLYZED KERATIN → PG-HYDROLYZED
  KERATIN, SD ALCOHOL 39-C → 39-D, XANTHANE → XANTHINE. Po zaostrzeniu rozmyte to 1,2% nazw
  (najczęściej HYDROXYDE → HYDROXIDE, ALPHA-ISOMETHYL LONONE → IONONE, XANTHAM → XANTHAN).
- **W API** indeks (ok. 50 tys. kluczy) trzymamy w pamięci i przebudowujemy, gdy zmieni się słownik
  (jedno tanie zapytanie o liczbę i maksymalne id).
- **Alternatywy:** pg_trgm w bazie (inna miara podobieństwa niż ta, którą sprawdziliśmy ręcznie),
  brak dopasowania rozmytego (tracimy ok. 1 punktu procentowego, głównie oczywiste literówki).

### D-69. Przegląd 500 najczęstszych nierozpoznanych nazw

- **Decyzja:** decyzje są w `data/alias-review.json` (edytowalny, w repo), lista do kontroli w
  `data/unknown-tokens.md`. Dla każdej nazwy: `alias` (inny zapis / język / literówka znanego INCI,
  np. GLICERINA, BEURRE DE KARITÉ, FENOSSIETANOLO), `new` (prawdziwa nazwa INCI, której brakuje
  w taksonomii — 307, np. PEG-40 HYDROGENATED CASTOR OIL, ISOHEXADECANE; źródło `reviewed`, bez
  funkcji i flag), `auto` (rozpozna się przez inny wpis), `not_ingredient` (fragmenty, adresy,
  klasy detergentów, materiał opakowania) albo `skip` (do decyzji zespołu — np. czy „Flavor”
  liczyć jak zapach). `pnpm catalog:apply-alias-review` stosuje plik, `catalog:unknown-tokens`
  dopisuje kolejne nazwy jako `skip` z podpowiedziami.
- **Uwaga:** propozycje przygotował asystent Claude na podstawie znajomości nazw INCI; każda „nowa
  nazwa” i alias z uwagą wymaga sprawdzenia w CosIng przez zespół przed obroną.
- **Granica:** 500 nazw pokrywa ok. 9 tys. z 29 tys. nierozpoznanych wystąpień — reszta to długi
  ogon (pojedyncze wystąpienia). Dalszy wzrost to kolejne porcje przeglądu albo pełny inwentarz
  CosIng.

### D-70. Kategorie produktów spoza pielęgnacji twarzy

- **Decyzja:** nowe kategorie `makeup`, `hair_care`, `body_care`, `oral_care`, `deodorant`
  (z `categories_tags` OBF, sprawdzane przed regułami pielęgnacji twarzy — „podkład do twarzy” to
  makijaż). Takie produkty nie trafiają do rutyny (ani generator, ani ręcznie), nie pojawiają się
  w „Produkty z tym składnikiem”, w wyszukiwarce są za produktami do twarzy; karta produktu mówi
  „To nie jest pielęgnacja twarzy” i nie ma „Dodaj do rutyny”. Wynik składu nadal liczymy.
- **Wynik:** z 12 837 produktów OBF: ciało 1813, włosy 1221, zęby 627, dezodoranty 556, makijaż
  372, pielęgnacja twarzy ok. 600; 7643 bez tagów zostaje „Inne”.

### D-71. Zdjęcia produktów na jasnej karcie

- **Decyzja:** token `photoCard` (jasny w obu motywach: #FFFFFF / #E9E9EC) — zdjęcie leży na
  zaokrąglonej karcie. Zdjęcia OBF mają białe tło, które w ciemnym motywie wyglądało jak dziura;
  na karcie wygląda na zamierzone.

### D-72. Atrybucja CosIng

- **Decyzja:** Profil → O aplikacji: „Składniki: CosIng — European Commission” z linkiem i
  informacją, że CosIng nie jest wiążący prawnie; karta składnika podaje źródło danych
  (słownik DermaMind / CosIng przez taksonomię OBF / nazwa dodana po przeglądzie).

### D-73. Aroma to aromat smakowy, nie zapach

- **Decyzja:** „Aroma” (CosIng 31992) jest osobnym składnikiem z funkcją `flavouring`; FLAVOR /
  FLAVOUR / FLAVORING są jego aliasami. Usunęliśmy alias Aroma → Parfum z naszego słownika, więc
  aroma nie należy do grupy „zapachy” i nie uruchamia reguły „unikam zapachów” ani flagi „bez
  zapachu”.
- **Dlaczego:** w prawie UE i w CosIng aroma to substancje smakowe (pasty do zębów, balsamy do
  ust), a parfum — kompozycje zapachowe. Stary alias sprawiał, że ~950 produktów (głównie pasty)
  wyglądało na „z zapachem”. Przez ten alias taksonomia OBF dopisała też wpis AROMA do PARFUM.
- **Alternatywy:** zostawić aroma jako zapach „na wszelki wypadek” — fałszywe ostrzeżenia.

### D-74. „SD Alcohol xx” = Alcohol Denat.

- **Decyzja:** amerykańskie oznaczenia alkoholu denaturowanego („SD Alcohol 39-C”, „SD Alcohol
  40-B”, „Alcohol Denat. (SD Alcohol 40)”) parser czyta jako Alcohol Denat. (`equivalentNames` w
  `@dermamind/scoring`), więc działa dla każdego numeru formuły, nie tylko tych z przeglądu.
- **Dlaczego:** w UE na etykiecie obowiązuje „Alcohol Denat.”; numer SD opisuje tylko denaturant.
  Dla oceny skóry liczy się, że to alkohol wysuszający.

Wynik po D-73 i D-74: 90,5% rozpoznanych nazw (202 215 z 223 407), 6 489 produktów w pełni
rozpoznanych (krok 5 w `data/obf-import-report.md`).

---

## Profil skóry i Ustawienia (19.11.2026)

### D-75. Dlaczego konto e-mail nie miało profilu skóry

- **Przyczyna 1 (to konto):** O1 → „Zaloguj się” → „Nie mam konta — załóż je” tworzy konto bez quizu
  (w bazie: brak `quiz_answers`). Potem nie było jak zrobić quizu — Profil pokazywał „Quiz pojawi się
  tu wkrótce”.
- **Przyczyna 2:** quiz zrobiony jako gość, potem „Mam już konto” → logowanie: odpowiedzi zostawały
  na koncie gościa, a konto e-mail dalej było puste.
- **Decyzja:** (1) bez profilu Profil i Dziś pokazują „Zrób quiz (2 min)” / „Uzupełnij profil skóry,
  żeby zobaczyć dopasowanie” — quiz bez kroków zakładania konta; (2) `POST /v1/auth/login` z tokenem
  gościa przenosi jego profil (typ skóry, cele, unikane składniki) i półki na konto, **tylko jeśli
  konto nie ma jeszcze profilu**; konto gościa jest potem usuwane. Istniejącego profilu nigdy nie
  nadpisujemy. Rejestracja gościa już wcześniej zachowywała to samo konto. Testy e2e:
  `apps/api/test/profile.e2e-spec.ts`.
- **Alternatywy:** pytać użytkownika, który profil zachować — dodatkowy ekran dla rzadkiego
  przypadku; scalanie odpowiedzi — nie ma sensownej reguły scalania.

### D-76. Ponowny quiz i edycja pojedynczej odpowiedzi

- **Decyzja:** te same ekrany O6–O19 (z wynikiem O14) pod osobnym adresem `/quiz/[step]` — bo
  `/onboarding` jest dostępny tylko przed zalogowaniem. Stan quizu ma tryb: `onboarding` (jak
  dotąd), `retake` (cały quiz od nowa, wypełniony zapisanymi odpowiedziami, na końcu „Zapisz
  profil”), `edit` (jedno pytanie z ekranu „Profil skóry”, przycisk „Zapisz”). Zapis to zawsze pełne
  `PUT /v1/me/quiz` (serwer przelicza typ skóry, barierę i wrażliwość), potem odświeżamy wszystkie
  zapytania — Match Score, Dziś i Rutyna liczą się od nowa. Odpowiedzi w trybie edycji nigdy nie są
  wysyłane jako „zaległy quiz z onboardingu”.
- **Alternatywy:** osobne endpointy na każde pole (PATCH) — więcej kodu i ryzyko niespójnego
  profilu, bo typ skóry zależy od kilku odpowiedzi naraz.

### D-77. Ustawienia i usunięte zaślepki

- **Decyzja:** ekran Ustawienia: imię (`PATCH /v1/me`), zmiana hasła (`POST
  /v1/auth/password/change` — nowe tokeny dla tego telefonu, inne sesje wylogowane; gość zamiast
  tego widzi „Zapisz profil na koncie”), Wygląd (przeniesiony z Profilu), język (tylko polski),
  Wyloguj, Usuń konto (z potwierdzeniem, `DELETE /v1/me`), wersja aplikacji.
- **Usunięte zaślepki:** „Quiz pojawi się tu wkrótce” i „Edytuj odpowiedzi — wkrótce” (Profil),
  „Ustawienia — wkrótce”, O21 „Już niedługo” (skaner i wyszukiwarka otwierają się teraz zaraz po
  zapisaniu profilu), O22 „Apple / Google — już niedługo” (przyciski ukryte, dopóki nie ma kluczy
  — `SOCIAL_SIGN_IN`), „Nie pamiętam hasła” (ekran obiecywał e-mail, którego serwer nie wysyła —
  wróci, gdy wybierzemy dostawcę poczty), nieużywany `PlaceholderScreen`.

---

## Poprawki po testach na telefonie (19.11.2026)

### D-78. Polskie nazwy składników w aplikacji, INCI w danych

- **Decyzja:** zapisujemy zawsze nazwę INCI (quiz, unikane składniki), a pokazujemy polską nazwę:
  kolumna `ingredients.name_pl` z `scripts/catalog/names-pl.ts` (144 składniki z utartą polską
  nazwą: „Alkohol denaturowany”, „Olej kokosowy”, „Laurylosiarczan sodu (SLS)”). `GET /v1/me`
  zwraca `avoidIngredientNames` (INCI → nazwa do chipa), wiersze składników i karta składnika —
  `namePl` jako podpis pod nazwą INCI. Nazwy bez polskiego odpowiednika (Butylene Glycol, Carbomer)
  pokazujemy jak w INCI, ale nigdy wielkimi literami z bazy; nieznane nazwy — tak, jak je wpisano.
- **Dlaczego:** na etykietach w Polsce jest INCI, więc dopasowanie musi iść po INCI; ale chip
  „ALCOHOL DENAT.” w profilu był nieczytelny. Test pilnuje, by każda polska nazwa należała do
  składnika ze słownika.

### D-79. Powody dopasowania pogrupowane

- **Decyzja:** jeden wiersz na powód ze wszystkimi składnikami („Pomaga na osłabioną barierę:
  Ceramide NP, Ceramide EOP, Tocopherol”), dwie sekcje — „Na co uważać” i „Dlaczego pasuje” — po
  maks. 3 wiersze + „Pokaż wszystkie”. Gdy produkt zawiera coś unikanego, „Na co uważać” jest
  pierwsze. Grupowanie (`groupReasons`) jest w `@dermamind/scoring` z testami, aplikacja dodaje
  tylko polskie teksty. Główne problemy w karcie profilu — neutralne chipy, czerwone zostają dla
  „Unikasz”.

### D-80. Własne zdjęcia produktów

- **Decyzja:** zdjęcia robi zespół i wrzuca do `data/images/` (nazwa pliku = EAN albo `id-<id>`,
  dowolny dopisek po „-” / „_” to nowa wersja). `pnpm catalog:attach-images` sprawdza nazwę,
  prawdziwy format (pierwsze bajty pliku, nie rozszerzenie) i rozmiar (≤ 5 MB), zapisuje
  `products.own_image` i czyści powiązania usuniętych plików. API serwuje je pod
  `/v1/product-images/<plik>` (ścisły wzorzec nazwy, bez ścieżek, cache tydzień);
  `own_image` ma pierwszeństwo przed `image_url`, a importy OBF go nie dotykają. Katalog na
  serwerze: `PRODUCT_IMAGES_DIR` (domyślnie `data/images` w repozytorium).
- **Nie pobieramy zdjęć ze sklepów** (prawa autorskie i regulaminy — jak w D-57).
- **Alternatywy:** Supabase Storage / S3 (konto i koszt, a na MVP wystarczy kilkadziesiąt zdjęć
  w repozytorium), zdjęcia w bazie (duże wiersze, brak cache HTTP).
