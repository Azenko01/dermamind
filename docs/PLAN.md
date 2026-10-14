# DermaMind AI — plan techniczny

Oct 9, 2026 · @Oleksandr

## 1. Cel produktu i zakres MVP

DermaMind AI to aplikacja mobilna, która ocenia, czy dany kosmetyk pasuje do skóry konkretnego użytkownika, na podstawie składu INCI i profilu skóry z kwestionariusza — bez analizy zdjęcia twarzy. Kierunek wynika wprost z analizy rynku: SkinSort pokazuje, że quiz wystarcza, a konkurencja przegrywa nadmiarem funkcji i paywallem. Nasza odpowiedź: mniej funkcji, każda dopracowana, wszystko darmowe i wytłumaczalne.

**Grupa docelowa:** osoby 16–35 lat w Polsce, kupujące kosmetyki w drogeriach (Hebe, Rossmann), które nie rozumieją składów INCI. Język aplikacji: PL (domyślny), EN, UA.

### W zakresie MVP (do obrony)

| # | Funkcja | Opis | Priorytet |
| --- | --- | --- | --- |
| F1 | Konto użytkownika | Rejestracja e-mail + hasło, logowanie Apple/Google, reset hasła | Must |
| F2 | Quiz skóry (onboarding) | 8–10 pytań → typ skóry, wrażliwość, problemy (trądzik, przebarwienia, suchość, zaczerwienienia, zmarszczki, rozszerzone pory) | Must |
| F3 | Składniki do unikania | Lista wykluczeń: wyszukiwarka składników + gotowe grupy (alkohol, perfumy, olejki eteryczne, silikony) | Must |
| F4 | Wyszukiwarka i katalog produktów | Wyszukiwanie po nazwie/marce, filtry kategorii, sortowanie po Match Score | Must |
| F5 | Skaner kodu kreskowego | Skan EAN-13 → karta produktu; brak w bazie → zgłoszenie produktu | Must |
| F6 | Karta produktu + Match Score | Wynik 0–100, lista składników z kolorami (dobry / neutralny / uwaga / wykluczony), uzasadnienie | Must |
| F7 | Karta składnika | Funkcja, dla jakiej skóry, ryzyko podrażnienia, komedogenność, wyjaśnienie AI | Must |
| F8 | Analiza wklejonego składu | Użytkownik wkleja listę INCI z opakowania → ten sam silnik oceny | Must |
| F9 | Generator rutyny | Rano/wieczór, kroki (oczyszczanie → tonik → serum → krem → SPF), produkty z bazy dobrane do profilu, opis AI | Must |
| F10 | Ulubione i historia | Zapisane produkty, ostatnio oglądane/zeskanowane | Should |
| F11 | Porównanie 2 produktów | Zestawienie składów i Match Score obok siebie | Should |
| F12 | Wykrywanie konfliktów w rutynie | Np. retinol + kwasy AHA tego samego wieczoru, witamina C + niacynamid (ostrzeżenie miękkie) | Should |
| F13 | Tryb ciemny, 3 języki | Motyw systemowy, i18n PL/EN/UA | Should |
| F14 | Panel administratora (web) | Dodawanie/edycja produktów i składników, moderacja zgłoszeń | Could |

### Poza zakresem (świadomie)

- Analiza zdjęcia skóry i jakiekolwiek diagnozy — aplikacja nie jest wyrobem medycznym; komunikat o tym w onboardingu i w ustawieniach.
- Funkcje społecznościowe, recenzje użytkowników, ranking.
- Płatności, subskrypcje, reklamy. Zasada jak w SkinSort: brak sponsorowanych wyników.
- Śledzenie efektów zdjęciami „przed/po”.
- OCR etykiety — tylko jako opcjonalne rozszerzenie po MVP, jeśli zostanie czas (sekcja 12).

## 2. Architektura i stack technologiczny

Decyzja (11.10.2026): aplikacja Expo (React Native) + własny serwer API w Node.js (NestJS, TypeScript) + PostgreSQL. Aplikacja rozmawia wyłącznie z naszym API przez HTTPS pod /v1; serwer liczy Match Score, pilnuje uprawnień i jako jedyny woła Claude API. Publikacja w App Store i Google Play dotyczy więc tylko aplikacji, a serwer możemy zmieniać bez wydawania nowej wersji w sklepach. Rezygnujemy z warstwy tRPC + Drizzle + MySQL z wersji beta (i szablonu Manus) — serwer piszemy od zera na PostgreSQL ze schematu Sa.Sha, co usuwa rozbieżność MySQL/PostgreSQL.

&#91;embedded content: architektura · aplikacja, Supabase, Claude API\]

Aplikacja zna tylko adres naszego API; do bazy i klucza Claude ma dostęp wyłącznie serwer, a do sklepów trafia sama aplikacja zbudowana przez EAS.

| Warstwa | Technologia | Uzasadnienie (do dziennika decyzji) |
| --- | --- | --- |
| Aplikacja mobilna | Expo SDK (najnowszy stabilny), React Native, TypeScript strict, Expo Router | Jeden kod na iOS i Android; EAS Build i EAS Submit wysyłają gotowe paczki do App Store i Google Play |
| Klient API | TanStack Query + klient generowany z OpenAPI serwera (orval) | Typy i wywołania powstają z kontraktu API — zmiana na serwerze od razu wychodzi w błędach kompilacji aplikacji |
| Stan lokalny | Zustand + expo-secure-store (tokeny) | Odpowiedzi z quizu przed założeniem konta, bezpieczne przechowywanie tokenów |
| Formularze i walidacja | React Hook Form + Zod | Te same schematy walidacji w aplikacji i na serwerze |
| Stylowanie | StyleSheet + własne tokeny (sekcja 7), Reanimated | Pełna kontrola nad wyglądem w stylu SkinSort |
| Skaner | expo-camera (EAN-13/EAN-8) | Wbudowany, bez zewnętrznych SDK |
| Serwer API | NestJS 11 na Node.js 22 LTS, TypeScript | Moduły = naturalny podział pracy w zespole 4 osób; Swagger/OpenAPI generowany z kodu (gotowa dokumentacja API do pracy) |
| ORM i migracje | Prisma | Schemat z sekcji 3 jako `schema.prisma`, migracje w repozytorium, seed z danymi Sa.Sha |
| Baza danych | PostgreSQL 16 (zarządzana, region UE) | Schemat Sa.Sha jest w PostgreSQL; baza niedostępna z internetu, łączy się z nią tylko serwer |
| Logika oceny | Pakiet `packages/scoring` (TypeScript), używany przez serwer i aplikację | Jedna implementacja algorytmu, testy Vitest; aplikacja może ocenić wklejony skład nawet offline |
| Uwierzytelnianie | Własne JWT: access 15 min + rotowany refresh 30 dni; hasła argon2; Sign in with Apple i Google weryfikowane na serwerze; konto gościa przed rejestracją | Pełna kontrola i łatwe do opisania w pracy; spełnia wymagania sklepów (sekcja 2.2) |
| AI | Anthropic SDK w module `ai` serwera, cache w tabeli `ai_cache` | Klucz API nigdy nie trafia do aplikacji |
| Hosting | Obraz Docker → Railway lub Render (region UE), domena z HTTPS, środowiska staging i production | Docker = brak uzależnienia od dostawcy, ten sam obraz lokalnie i w chmurze |
| i18n | i18next + expo-localization | PL/EN/UA; nazwy INCI zostają po łacinie |
| Testy | Vitest (scoring, serwisy), Jest + Supertest (endpointy na testowej bazie), RNTL (komponenty), Maestro (E2E) | Pokrycie każdej warstwy |
| CI/CD | GitHub Actions + EAS Build/Submit | Lint, testy, build obrazu i deploy serwera; buildy aplikacji do sklepów |
| Monitoring | Sentry (aplikacja i serwer), logi pino | Błędy z produkcji przed obroną |

**Zasada podziału odpowiedzialności:** wynik dopasowania liczy serwer według reguł (deterministycznie), AI tylko tłumaczy i opisuje. Dzięki temu ten sam produkt zawsze dostaje ten sam wynik, a odpowiedź AI nie może „zmyślić” oceny — to mocny argument na obronę.

**Dlaczego NestJS, a nie FastAPI:** jeden język (TypeScript) w aplikacji, na serwerze i w pakiecie `scoring` — algorytm piszemy raz, a typy API generują się automatycznie. FastAPI też by się sprawdził, ale wymagałby drugiej implementacji algorytmu w Pythonie.

### 2.1 Moduły serwera

| Moduł | Odpowiada za |
| --- | --- |
| `auth` | Rejestracja, logowanie e-mail, Apple, Google, konto gościa, refresh tokenów, reset hasła |
| `users` | Profil skóry i quiz, wykluczenia, eksport danych, usunięcie konta |
| `catalog` | Produkty, składniki, wyszukiwanie, kody EAN, kolekcje |
| `scoring` | Match Score, flagi „Co jest w środku”, alternatywy, konflikty (na bazie `packages/scoring`) |
| `routines` | Rutyny rano/wieczór, wynik rutyny, odhaczanie kroków |
| `shelves` | Półki: Mam, Lubię, Unikam |
| `submissions` | Zgłoszenia nieznanych produktów |
| `ai` | Opisy składników, „Dlaczego taki wynik”, rutyna AI, parser INCI — cache i limity |
| `app-config` | Minimalna wersja aplikacji, przełączniki funkcji |
| `admin` (Could) | Moderacja zgłoszeń, edycja katalogu |

Każdy moduł to osobny katalog z kontrolerem, serwisem, DTO i testami — da się go przydzielić jednej osobie bez konfliktów w kodzie.

### 2.2 Gotowość pod App Store i Google Play

Te wymagania sklepów spełniamy od pierwszego sprintu, żeby publikacja w sprincie 8 była formalnością:

- [ ] **Tylko HTTPS i stała domena API** (np. `api.dermamind.app` lub subdomena azenko.dev) — iOS blokuje zwykłe HTTP.
- [ ] **Wersjonowanie `/v1`** — starsze wersje aplikacji w telefonach muszą działać po każdym wdrożeniu serwera; zmiany łamiące kontrakt idą do `/v2`.
- [ ] **`GET /v1/app-config`** z minimalną wersją aplikacji → ekran „Zaktualizuj aplikację”, gdy zmiana wymaga nowego wydania w sklepie.
- [ ] **Sign in with Apple obok Google** — App Store wymaga takiej opcji przy logowaniu przez zewnętrznych dostawców.
- [ ] **Usuwanie konta w aplikacji i przez stronę WWW** — wymagane przez App Store i Google Play.
- [ ] **Polityka prywatności pod stałym adresem** i formularze App Privacy / Data safety zgodne z tym, co faktycznie zapisuje API.
- [ ] **Żadnych sekretów w aplikacji** — klucz Claude, sekrety JWT i hasło bazy tylko na serwerze; adres API w konfiguracji EAS osobno dla staging i production.
- [ ] **Identyfikatory aplikacji** `com.dermamind.app` (bundle ID iOS i pakiet Android) ustalone w sprincie 0 — później nie da się ich zmienić.
- [ ] **Konta deweloperskie** Apple Developer i Google Play Console założone w sprincie 0 (weryfikacja trwa kilka dni).

### 2.3 Serwer i baza: gdzie co działa (decyzja z 12.10.2026)

Podsumowanie wcześniejszych rozmów o serwerze. Główna zasada: **serwer uruchamia kod, baza przechowuje dane**. To dwie osobne usługi.

| Co | Gdzie | Koszt | Dlaczego |
| --- | --- | --- | --- |
| Aplikacja | Google Play (później App Store) | jednorazowo $25 za konto deweloperskie | ludzie dostają link do gotowej aplikacji, a nie archiwum do pobrania |
| Serwer API (NestJS) | Render, darmowy plan | 0 | działa całą dobę w chmurze bez naszego komputera; klucz Claude jest tylko tutaj, w chronionych zmiennych |
| Baza danych (PostgreSQL) | Supabase, darmowy plan | 0 | dane są trwałe: i katalog kosmetyków, i profile użytkowników |

**Dlaczego baza osobno.** W becie baza była plikiem SQLite bezpośrednio na Render. Render po bezczynności usypia i restartuje się, a przy restarcie system plików jest czyszczony, więc profile znikały. Gdy baza jest w Supabase, serwer może usypiać dowolnie często: za każdym razem pobiera dane z bazy.

**Dlaczego nie serwer na własnym komputerze.** Aplikacja działałaby tylko wtedy, gdy komputer jest włączony i w domu. Na dyplom i dla komisji potrzebny jest link, który działa zawsze.

**Dlaczego Render, a nie Vercel.** Vercel uruchamia kod krótkimi wywołaniami na każde żądanie i dłuższa odpowiedź Claude może nie zmieścić się w limicie czasu darmowego planu. Vercel nie ma też własnej bazy, więc Supabase i tak jest potrzebny. Vercel zostaje dla strony projektu.

**Minus darmowego Render:** po bezczynności pierwsze żądanie „budzi” serwer przez ok. 30 sekund. Na pracę dyplomową to akceptowalne; aplikacja pokazuje wtedy ekran ładowania. Przejście na płatny plan ($7/mies.) nie zmienia nic w kodzie.

**Supabase używamy tylko jako PostgreSQL.** Połączenie przez Prisma, jeden ciąg `DATABASE_URL`, bez Supabase Auth i bez zapytań bezpośrednio z aplikacji. Przeprowadzka (Neon, Railway) oznacza zmianę tylko tego ciągu.

**Kto co robi.** Claude pisze schemat, migracje, kod połączenia i cały backend. Oleksandr sam zakłada konta Supabase, Render i Google Play oraz wkleja ciąg połączenia i klucze do chronionych zmiennych hostingu. To ok. 10–15 minut pracy ręcznej według instrukcji krok po kroku. Sekretów nie wklejamy do czatu ani nie commitujemy do repozytorium.

**Kolejność.** Najpierw szkielet aplikacji w Expo i serwer lokalnie, wdrożenie później, gdy będzie co pokazać. Osobno przed oddaniem trzeba dokończyć stronę projektu.

## 3. Model danych

Schemat Sa.Sha (`products`, `ingredients`, `product_ingredients`) zostaje rdzeniem, ale wymaga czterech zmian: kolejności składnika w składzie, kodu kreskowego, metadanych składnika i tabeli wpływu składników na problemy skóry. Bez kolejności nie da się odróżnić składnika z 1. miejsca od śladowego z 25.

### 3.1 Uwagi do obecnego schematu

- `product_ingredients` nie ma `position` — dodajemy (kolejność INCI = malejące stężenie).
- `products` nie ma `barcode` (EAN) — bez tego skaner nie działa.
- `ingredients.name` bez `UNIQUE` i bez normalizacji — „Aqua”, „AQUA”, „Water” to trzy rekordy. Dodajemy `inci_name` (kanoniczna) + tabelę `ingredient_aliases`.
- `category` jako wolny tekst → typ wyliczeniowy (jedna literówka psuje generator rutyny).
- Dane testowe (3 produkty, 6 składników) zastępujemy importem 42 produktów z Hebe i rozbudową do min. 150 produktów przed obroną.

### 3.2 Katalog (dane publiczne, tylko odczyt dla użytkowników)

```sql
create type product_category as enum (
  'cleanser','toner','essence','serum','moisturizer','eye_cream',
  'sunscreen','mask','exfoliant','spot_treatment','oil','other'
);
create type routine_step as enum ('cleanse','tone','treat','moisturize','protect');

create table brands (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  country     text
);

create table products (
  id            bigint generated always as identity primary key,
  name          text not null,
  brand_id      bigint references brands(id),
  category      product_category not null,
  barcode       text unique,               -- EAN-13
  image_url     text,
  volume_ml     numeric,
  price_pln     numeric(8,2),
  source        text,                      -- 'hebe', 'user_submission', ...
  inci_raw      text,                      -- oryginalny skład z opakowania
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  search        tsvector generated always as
                (to_tsvector('simple', coalesce(name,''))) stored
);
create index on products using gin (search);

create table ingredients (
  id               bigint generated always as identity primary key,
  inci_name        text not null unique,   -- forma kanoniczna, np. 'NIACINAMIDE'
  display_name     text not null,          -- 'Niacinamide'
  functions        text[] not null default '{}', -- humectant, emollient, ...
  comedogenic      smallint check (comedogenic between 0 and 5),
  irritation_risk  smallint check (irritation_risk between 0 and 3),
  is_fragrance     boolean not null default false,
  is_alcohol_drying boolean not null default false,
  description_pl   text, description_en text, description_uk text
);

create table ingredient_aliases (
  alias          text primary key,         -- zapis znormalizowany (lower, bez spacji)
  ingredient_id  bigint not null references ingredients(id) on delete cascade
);

create table product_ingredients (
  product_id     bigint references products(id) on delete cascade,
  ingredient_id  bigint references ingredients(id),
  position       smallint not null,        -- 1 = najwyższe stężenie
  primary key (product_id, ingredient_id)
);

create table skin_concerns (
  id    smallint primary key,
  code  text not null unique                -- acne, hyperpigmentation, dryness, redness, aging, pores, sensitivity, oiliness
);

-- wpływ składnika na problem / typ skóry: serce algorytmu
create table ingredient_effects (
  ingredient_id  bigint references ingredients(id) on delete cascade,
  concern_id     smallint references skin_concerns(id),
  effect         smallint not null check (effect between -2 and 2), -- -2 szkodzi ... +2 bardzo pomaga
  evidence       text,                     -- źródło / przypis do dokumentacji
  primary key (ingredient_id, concern_id)
);

create table ingredient_groups (           -- 'fragrance', 'drying_alcohol', 'silicones', 'essential_oils'
  id    smallint primary key,
  code  text not null unique
);
create table ingredient_group_members (
  group_id       smallint references ingredient_groups(id),
  ingredient_id  bigint references ingredients(id),
  primary key (group_id, ingredient_id)
);

create table ingredient_conflicts (        -- do F12
  a_id      bigint references ingredients(id),
  b_id      bigint references ingredients(id),
  severity  smallint not null check (severity between 1 and 2),
  note_key  text not null,                 -- klucz i18n z wyjaśnieniem
  primary key (a_id, b_id)
);
```

### 3.3 Dane użytkownika (dostęp tylko właściciela przez API)

```sql
create type skin_type as enum ('dry','oily','combination','normal');

create table profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  skin_type      skin_type,
  is_sensitive   boolean not null default false,
  age_range      text,                     -- '16-24', '25-34', '35+'
  locale         text not null default 'pl',
  quiz_answers   jsonb,                    -- surowe odpowiedzi, do ponownego przeliczenia
  onboarded_at   timestamptz
);

create table profile_concerns (
  user_id     uuid references profiles(user_id) on delete cascade,
  concern_id  smallint references skin_concerns(id),
  priority    smallint not null default 1,  -- 1 = główny problem
  primary key (user_id, concern_id)
);

create table avoided_ingredients (
  user_id        uuid references profiles(user_id) on delete cascade,
  ingredient_id  bigint references ingredients(id),
  primary key (user_id, ingredient_id)
);
create table avoided_groups (
  user_id   uuid references profiles(user_id) on delete cascade,
  group_id  smallint references ingredient_groups(id),
  primary key (user_id, group_id)
);

create table favorites (
  user_id     uuid references profiles(user_id) on delete cascade,
  product_id  bigint references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table scan_history (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(user_id) on delete cascade,
  product_id  bigint references products(id),
  barcode     text,                        -- także nieznalezione kody
  scanned_at  timestamptz not null default now()
);

create table routines (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references profiles(user_id) on delete cascade,
  time_of_day text not null check (time_of_day in ('am','pm')),
  ai_summary  text,
  created_at  timestamptz not null default now()
);
create table routine_items (
  routine_id  bigint references routines(id) on delete cascade,
  step        routine_step not null,
  product_id  bigint references products(id),
  position    smallint not null,
  primary key (routine_id, position)
);

create table product_submissions (         -- skan nieznanego kodu
  id          bigint generated always as identity primary key,
  user_id     uuid references profiles(user_id) on delete set null,
  barcode     text, name text, brand text, inci_raw text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

create table ai_cache (
  key         text primary key,            -- hash(prompt_version + kind + input)
  kind        text not null,                -- 'ingredient_explain', 'product_summary', 'routine'
  locale      text not null,
  content     jsonb not null,
  model       text not null,
  created_at  timestamptz not null default now()
);
```

### 3.4 Bezpieczeństwo i autoryzacja w API

- Baza nie jest wystawiona do internetu; łączy się z nią tylko serwer (Prisma, osobny użytkownik bazy z minimalnymi uprawnieniami).
- Katalog (produkty, składniki): odczyt bez logowania i dla konta gościa; zapis tylko z rolą `admin` i przez skrypty importu.
- Dane użytkownika: każdy endpoint bierze `user_id` z tokenu JWT, nigdy z parametrów — guard NestJS sprawdza, że zasób należy do zalogowanego (użytkownik A nie dostanie danych B).
- Konto gościa: `POST /v1/auth/guest` tworzy anonimowego użytkownika na czas quizu; przy O22 łączymy go z kontem Apple / Google / e-mail i dane zostają.
- `ai_cache`, `ai_usage`, tokeny refresh (przechowywane jako hash) — nigdy nie wychodzą przez API.
- Limity zapytań (`@nestjs/throttler`), nagłówki bezpieczeństwa (helmet), walidacja każdego wejścia (DTO + Zod).
- Schemat SQL z sekcji 3.2, 3.3 i 3.6 przenosimy do `schema.prisma`; zamiast `auth.users` (z planu na Supabase) mamy własną tabelę `users` (e-mail, hash hasła, `apple_sub`, `google_sub`, `is_guest`, rola) i `refresh_tokens`.
- Migracje w `apps/api/prisma/migrations/`, dane startowe w `prisma/seed.ts` (INSERT Sa.Sha staje się częścią seeda po dopasowaniu do nowych kolumn).

### 3.5 Import danych

Skrypt `scripts/import-products.ts`: CSV/JSON z Hebe → normalizacja nazwy INCI (wielkie litery, usunięcie „(and)”, nawiasów, gwiazdek) → dopasowanie przez `ingredient_aliases` → nieznane składniki trafiają do raportu do ręcznego uzupełnienia. Źródła do rozbudowy bazy: [Open Beauty Facts](https://github.com/openfoodfacts/openbeautyfacts) (kody EAN + składy, licencja ODbL — do przypisania w dokumentacji) i baza CosIng Komisji Europejskiej (funkcje składników).

### 3.6 Uzupełnienia pod dizajn SkinSort

Onboarding i karta produktu z sekcji 6 wymagają kilku dodatkowych kolumn i tabel:

```sql
-- profil: wynik quizu i preferencje
alter table profiles
  add column oil_level         smallint check (oil_level between -3 and 3),
  add column barrier_level     smallint check (barrier_level between 1 and 3),   -- 1 dobra, 3 nadwerężona
  add column sensitivity_level smallint check (sensitivity_level between 0 and 4),
  add column budget            text check (budget in ('lt30','30_70','70_150','gt150')),
  add column uses_spf          text check (uses_spf in ('daily','sometimes','rarely')),
  add column must_haves        text[] not null default '{}';  -- 'vegan','cruelty_free','reef_safe'

-- składniki: flagi do „Co jest w środku” i grup wykluczenia
alter table ingredients
  add column is_fungal_acne_trigger boolean not null default false,
  add column is_eu_allergen         boolean not null default false,  -- 26 alergenów zapachowych UE
  add column is_paraben             boolean not null default false,
  add column is_sulfate             boolean not null default false,
  add column is_silicone            boolean not null default false,
  add column is_oil                 boolean not null default false,
  add column is_animal_derived      boolean not null default false,
  add column is_reef_harmful        boolean not null default false;

alter table brands add column cruelty_free boolean;  -- null = brak danych

-- flagi produktu liczone ze składu (widok, bez duplikowania danych)
create view product_flags as
select p.id as product_id,
  bool_and(not i.is_alcohol_drying)       as alcohol_free,
  bool_and(not i.is_fragrance)            as fragrance_free,
  bool_and(not i.is_silicone)             as silicone_free,
  bool_and(coalesce(i.comedogenic,0) < 3) as pore_clogger_free,
  bool_and(not i.is_eu_allergen)          as eu_allergen_free,
  bool_and(not i.is_oil)                  as oil_free,
  bool_and(not i.is_sulfate)              as sulfate_free,
  bool_and(not i.is_paraben)              as paraben_free,
  bool_and(not i.is_fungal_acne_trigger)  as fungal_acne_safe,
  bool_and(not i.is_animal_derived)       as vegan,
  bool_and(not i.is_reef_harmful)         as reef_safe
from products p
join product_ingredients pi on pi.product_id = p.id
join ingredients i on i.id = pi.ingredient_id
group by p.id;

-- półki zamiast „ulubionych”
create table shelves (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references profiles(user_id) on delete cascade,
  kind      text not null check (kind in ('own','like','avoid','custom')),
  name      text
);
create table shelf_items (
  shelf_id   bigint references shelves(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (shelf_id, product_id)
);

-- ekran Dziś: samopoczucie skóry i odhaczanie rutyny (Should)
create table skin_checkins (
  user_id uuid references profiles(user_id) on delete cascade,
  day     date not null,
  mood    smallint not null check (mood between 1 and 5),
  primary key (user_id, day)
);
create table routine_logs (
  user_id    uuid references profiles(user_id) on delete cascade,
  routine_id bigint references routines(id) on delete cascade,
  day        date not null,
  done_steps smallint[] not null default '{}',
  primary key (user_id, routine_id, day)
);
```

- `favorites` z sekcji 3.3 zastępują `shelves` + `shelf_items`; przy rejestracji tworzymy trzy półki systemowe.
- `skin_concerns` rozszerzamy o kody z O7: `breakouts`, `oiliness`, `pores`, `texture`, `dark_spots`, `radiance`, `redness`, `rosacea_prone`, `eczema_prone`, `hydration`, `wrinkles`.
- `ingredient_groups` = grupy z O15 (`fragrance`, `drying_alcohol`, `fungal_acne`, `parabens`, `sulfates`, `silicones`, `eu_allergens`), wypełniane z flag składników.
- „Cruelty-free” to cecha marki, nie składu — bez danych pokazujemy „brak danych”, nie ×.

## 4. Algorytm dopasowania (Match Score)

Match Score to liczba 0–100 liczona regułami, nie przez AI: ten sam produkt i ten sam profil zawsze dają ten sam wynik z listą powodów. Implementacja: funkcja `compute_match_score(profile, product)` w pakiecie `packages/scoring` (TypeScript), wołana przez moduł `scoring` serwera z danymi z bazy i przez aplikację przy analizie wklejonego składu; testy jednostkowe w Vitest.

### 4.1 Kroki

1. **Wykluczenia (twarda reguła).** Jeśli produkt zawiera składnik z `avoided_ingredients` lub z grupy z `avoided_groups` → status `excluded`, wynik nie jest pokazywany jako liczba, tylko „Zawiera składnik, którego unikasz: X”.
2. **Problemy użytkownika.** Zbiór C = problemy z `profile_concerns` + problem wynikający z typu skóry (sucha → `dryness`, tłusta → `oiliness`, mieszana → `oiliness` z priorytetem 2). Waga problemu: priorytet 1 → 1.0, priorytet 2 → 0.6, kolejne → 0.4.
3. **Waga pozycji w składzie.** Pozycje 1–5 → 1.0, 6–10 → 0.6, 11+ → 0.3. Proste progi zamiast funkcji ciągłej — łatwiej wytłumaczyć na obronie i w UI.
4. **Korzyści i szkody.** Dla każdej pary (składnik, problem z C) z `ingredient_effects`: wkład = efekt × waga pozycji × waga problemu. Suma dodatnich = B, suma ujemnych (wartość bezwzględna) = H.
5. **Kary profilowe P.** Skóra wrażliwa: −8 × waga pozycji za każdy zapach, −6 × waga za `irritation_risk ≥ 2`. Skóra tłusta lub trądzik: −10 × waga za `comedogenic ≥ 3` w pozycjach 1–10. Skóra sucha: −10 za wysuszający alkohol w pozycjach 1–5.
6. **Wynik.**

```latex
\text{Score} = \operatorname{clamp}\left(50 + 10B - 12H - P,\ 0,\ 100\right)
```

7. **Pewność.** Jeśli ponad 30% składników nie ma żadnych danych w `ingredient_effects` ani metadanych → flaga `low_confidence` i dopisek „Ocena na podstawie niepełnych danych”.

**Zmiany po analizie SkinSort:**

- Produkt z wykluczonym składnikiem też dostaje liczbę, ale obciętą do maks. 40 i z etykietą „Nie pasuje” + powód („Zawiera wyzwalacze trądziku grzybiczego”) — użytkownik widzi skalę problemu, a ranking nadal działa.
- `must_haves` (wegański, bez testów, bezpieczny dla raf) nie zmieniają wyniku, tylko sortowanie: produkty spełniające wymagania idą wyżej w kolekcjach i alternatywach.
- Budżet filtruje kolekcje i alternatywy, nie wynik.
- `barrier_level` = 3 dodaje karę −6 × waga pozycji za składniki z `irritation_risk ≥ 2` (jak przy wrażliwości).
- Wynik rutyny (T1, T3) = średnia wyników produktów w rutynie − 10 za każdy konflikt składników − 10 za brak SPF rano.

### 4.2 Etykiety w UI

| Wynik | Etykieta | Kolor |
| --- | --- | --- |
| 75–100 | Świetnie pasuje | zielony |
| 50–74 | Pasuje | fioletowy (akcent) |
| 30–49 | Z ostrożnością | pomarańczowy |
| 0–29 | Nie polecamy | czerwony |
| — | Zawiera wykluczony składnik | czerwony, ikona blokady |

### 4.3 Zwracany obiekt

```json
{
  "score": 82,
  "status": "ok",
  "label": "great",
  "low_confidence": false,
  "pros": [{"ingredient": "Niacinamide", "concern": "acne", "impact": 20}],
  "cons": [{"ingredient": "Parfum", "reason": "fragrance_sensitive", "impact": -8}],
  "excluded_by": []
}
```

### 4.4 Wydajność

Katalog wyszukiwania z wynikiem dla zalogowanego użytkownika: funkcja `search_products(query, category, sort)` liczy wynik tylko dla bieżącej strony (20 produktów). Przy 150–2000 produktów nie potrzeba materializacji; jeśli baza urośnie, dodamy tabelę `user_product_scores` odświeżaną po zmianie profilu.

### 4.5 Kalibracja

Wagi (10, 12, 8, 6) to punkt startowy. Przed obroną: zestaw 20 par profil–produkt ocenionych ręcznie (najlepiej z konsultacją kosmetologa) jako test regresyjny; wagi dostrajamy, aż wynik algorytmu zgadza się z oceną ekspercką w co najmniej 80% przypadków co do etykiety. Wynik tej walidacji idzie do rozdziału badawczego pracy.

## 5. Rola AI (Claude API)

AI ma w aplikacji cztery zadania, wszystkie tekstowe i wszystkie oparte na danych z bazy przekazanych w prompcie — model nigdy nie decyduje o wyniku ani nie dobiera produktów spoza bazy.

| Funkcja modułu ai | Wejście | Wyjście | Cache |
| --- | --- | --- | --- |
| `ai-ingredient-explain` | Składnik + metadane + efekty z bazy, język | 2–3 zdania prostym językiem: co robi, dla kogo, na co uważać | Tak, per składnik × język (współdzielony między użytkownikami) |
| `ai-product-summary` | Wynik `compute_match_score` (pros/cons), profil (bez danych osobowych), język | Krótkie uzasadnienie „Dlaczego taki wynik” | Tak, per produkt × hash profilu × język |
| `ai-routine` | Profil + kandydaci z bazy wybrani algorytmem (top 3 na krok) | Wybór po 1 produkcie na krok + opis rutyny + kolejność nakładania + ostrzeżenia o konfliktach | Nie (zapis w `routines.ai_summary`) |
| `ai-parse-inci` | Wklejony tekst składu | Lista znormalizowanych nazw INCI w kolejności (fallback, gdy parser regułowy nie radzi sobie z formatowaniem) | Tak, per hash tekstu |

### 5.1 Zasady techniczne

- **Strukturalne odpowiedzi:** każda funkcja wymusza JSON przez tool use / schemat; walidacja Zod po stronie serwera, przy błędzie jedna ponowna próba, potem komunikat zastępczy.
- **Model:** tańszy i szybszy model z rodziny Claude do opisów (`ai-ingredient-explain`, `ai-parse-inci`), mocniejszy do rutyny. Nazwy modeli w zmiennych środowiskowych, nie w kodzie — sprawdzić aktualne identyfikatory w dokumentacji Anthropic przed implementacją.
- **Wersjonowanie promptów:** prompty w `apps/api/src/ai/prompts/*.ts` ze stałą `PROMPT_VERSION`; zmiana wersji unieważnia cache.
- **Limity:** 30 wywołań AI na użytkownika dziennie (licznik w tabeli `ai_usage`), timeout 20 s, streaming niepotrzebny.
- **Bezpieczeństwo treści:** prompt systemowy zabrania porad medycznych i diagnoz; każda odpowiedź o rutynie kończy się stałą formułką (z i18n, nie z modelu) o konsultacji z dermatologiem przy problemach skórnych.
- **Prywatność:** do API trafia tylko typ skóry, problemy i wykluczenia — bez e-maila, imienia i identyfikatora użytkownika.
- **Koszt:** dzięki cache opisy składników generujemy raz; szacunek do sprawdzenia w testach obciążeniowych przed publikacją.

### 5.2 Generator rutyny — dokładny przepływ

1. SQL wybiera kandydatów: dla każdego kroku (`cleanse`, `tone`, `treat`, `moisturize`, `protect` tylko rano) produkty z kategorii kroku, bez wykluczeń, z wynikiem ≥ 50, top 3 po wyniku.
2. Serwer wysyła kandydatów + profil do Claude, który wybiera po jednym, uzasadnia i układa kolejność (np. serum z witaminą C rano, retinoid wieczorem).
3. Funkcja sprawdza wybór regułami: czy ID należą do kandydatów, czy brak konfliktów z `ingredient_conflicts` w tej samej porze dnia. Niezgodność → odrzucenie wyboru modelu i użycie top 1 z SQL.
4. Zapis do `routines` + `routine_items`; użytkownik może podmienić produkt w kroku ręcznie (ponowne sprawdzenie konfliktów lokalnie).

## 6. Ekrany i przepływy użytkownika

Układ i przepływy wzorujemy na SkinSort (zrzuty z 9.10.2026): najpierw krótki quiz bez konta, wynik typu skóry na skali, preferencje, dopiero na końcu „Zapisz profil” przez Apple / Google / e-mail. Pomijamy to, co kłóci się z naszymi zasadami: paywall, opinie użytkowników, społeczność i „skąd o nas wiesz”. Każdy ekran ma 4 stany: ładowanie (skeleton), pusty, błąd z ponowieniem, dane.

### 6.1 Onboarding: quiz przed kontem (22 ekrany, ok. 2 minuty)

Wspólny szablon ekranu quizu: strzałka wstecz + cienki pasek postępu u góry, pytanie dużym krojem (regular, nie bold), podpis szary, karty odpowiedzi, przycisk „Dalej” przyklejony do dołu — wyszarzony, dopóki nic nie wybrano.

| # | Ekran | Typ odpowiedzi | Zapis / użycie |
| --- | --- | --- | --- |
| O1 | Powitanie: „Sprawdź, co działa na Twoją skórę, zanim kupisz” + makieta 3 ekranów aplikacji | „Zaczynamy” / „Mam już konto” | — |
| O2 | „A gdyby pielęgnacja miała wreszcie sens?” (ilustracja) | Dalej | — |
| O3 | Pytania w jednym miejscu: „Czego używać? Co jest w środku? W jakiej kolejności?” | Dalej | — |
| O4 | Demo Match Score: siatka produktów z pigułkami „87% dopasowania” | Dalej | — |
| O5 | „Pracujemy dla Twojej skóry, nie dla marek”: 0 sponsorowanych wyników, skład zamiast marketingu | Dalej | Bez opinii i gwiazdek — nie mamy prawdziwych |
| O6 | Największy problem z pielęgnacją (podrażnienia / brak efektów / za dużo produktów / chcę rutyny) | Jeden wybór, karta z ikoną | `quiz_answers.struggle` → kolejność sekcji na ekranie Dziś |
| O7 | Cele skóry: wypryski, błyszczenie, pory, tekstura, przebarwienia, blask, zaczerwienienia, skłonność do trądziku różatego, skłonność do AZS, nawilżenie, zmarszczki | Wiele, chipy z ikonami | `profile_concerns` |
| O8 | Jak bardzo błyszczy się po południu: czoło i nos / policzki / broda i żuchwa | Akordeon: 3 strefy × 4 odpowiedzi | Poziom sebum, wykrycie skóry mieszanej |
| O9 | Jak skóra czuje się 30 min po myciu | Jeden wybór | Sebum + bariera |
| O10 | Co zauważyłeś w ostatnich 2 tygodniach (łuszczenie, szorstkość, ściągnięcie, matowość, pękanie, nic) | Wiele | Stan bariery |
| O11 | Jak często skóra reagowała w ostatnim miesiącu | Jeden wybór | Wrażliwość |
| O12 | Co wywołuje reakcję (kosmetyki, temperatura, wiatr, twarda woda, słońce, stres, nic) | Wiele | Wrażliwość; „kosmetyki” → kara za zapachy w algorytmie |
| O13 | Czy skóra zmienia się latem i zimą | Jeden wybór | Korekta sebum |
| O14 | **Wynik typu skóry**: skala sucha → zrównoważona → tłusta ze znacznikiem „Ty: …”, karta z poradą („lżejsze konsystencje”), bariera i wrażliwość jako kropki 1–4, dopisek „To obraz chwili, nie diagnoza” | Dalej | `skin_type`, `oil_level`, `barrier_level`, `sensitivity_level` |
| O15 | Składniki do **unikania** — grupy: zapachy, wysuszające alkohole, wyzwalacze trądziku grzybiczego, parabeny, siarczany, silikony, alergeny UE | Wiele, checkboxy z ikonami | `avoided_groups` |
| O16 | Konkretne składniki: wyszukiwarka + „Często unikane” jako chipy z „+”, wybrane jako czerwone chipy z „×” | Wyszukiwanie | `avoided_ingredients` |
| O17 | Wymagania: wegańskie, bez testów na zwierzętach, bezpieczne dla raf, brak wymagań | Wiele, karty z opisem | `profiles.must_haves` → premia w rankingu |
| O18 | Czy używasz SPF codziennie | Jeden wybór | Rutyna: przypomnienie o SPF |
| O19 | Budżet na produkt (do 30 / 30–70 / 70–150 / 150+ zł) — z bety | Jeden wybór | Filtr rekomendacji |
| O20 | „Twój profil jest gotowy” — okrąg 100% z animacją i konfetti, 3 punkty co się dzieje | „Zaczynamy” | Bez wymyślonych liczb typu „100 000 analiz” |
| O21 | „Dodaj produkty, których używasz”: Skanuj / szukaj po nazwie lub marce / „Nie mam jeszcze” | Opcjonalne | Pierwsza rutyna + półka „Mam” |
| O22 | „Zapisz swój profil”: Apple, Google, „Więcej opcji” (e-mail), regulamin i polityka prywatności | Logowanie | Odpowiedzi trzymane lokalnie (Zustand + AsyncStorage) do tej chwili, potem `PUT /v1/me/quiz` |

**Wyliczenie typu skóry** (`packages/scoring/quiz.ts`): każda strefa z O8 daje +2 / +1 / 0 / −1, O9 i O13 korekty ±1. Suma → `oil_level` od −3 do +3. Sucha ≤ −2, zrównoważona −1…+1, tłusta ≥ +2, a **mieszana**, gdy strefa T ≥ +1 i policzki ≤ 0. Bariera = liczba objawów z O10 (0–1 dobra, 2 osłabiona, 3+ nadwerężona). Wrażliwość = O11 (0–3) + 1 punkt, jeśli w O12 są kosmetyki. Progi idą do testów jednostkowych i do pracy jako tabela reguł.

### 6.2 Zakładki główne (dolny pasek, 5 pozycji)

| # | Zakładka | Zawartość |
| --- | --- | --- |
| T1 | **Dziś** | Pasek dni tygodnia, „Dobry wieczór, {imię}”, karta „Jak dziś Twoja skóra?” (5 buźk: źle…świetnie), karta „Wynik rutyny”, „Dzisiejsza rutyna” do odhaczania (pusty stan: kiełek + „Dodaj produkty”) |
| T2 | **Odkrywaj** | Wyszukiwarka z ikoną aparatu (skaner kodu), okrągłe ikony: Filtry, Dla Ciebie, Oczyszczanie, Serum, Kremy, SPF…; skróty „Analizuj skład” i „Porównaj”; poziome karuzele kolekcji („Oczyszczanie dla Twojej tłustej skóry”, „Kremy bez zapachów”) z pigułką „92% dopasowania” i serduszkiem; lista kategorii z sortowaniem i kartami produktów |
| T3 | **Rutyna** | Karta powitalna od asystenta, sekcje Rano ☀ / Wieczór ☾, numerowane sloty kroków („Dodaj produkt — Oczyszczanie”), menu „…” (wygeneruj AI, kolejność), „+” |
| T4 | **Półka** | Kolekcje produktów: Mam, Lubię, Unikam (+ własne); zastępuje „Ulubione” z bety; pusty stan z gwiazdkami |
| T5 | **Profil** | Karta z avatarem i imieniem, Profil skóry (podgląd wyniku O14 + edycja), Historia skanów, Zgłoś produkt, Ustawienia (konto, język, motyw, prywatność, eksport i usunięcie danych, wyloguj), wersja aplikacji |

Skaner nie ma osobnej zakładki — jak w SkinSort jest ikoną aparatu w wyszukiwarce (T2) i przyciskiem w O21 oraz w pustych stanach.

### 6.3 Karta produktu (D1) — kolejność sekcji

1. Pasek: wstecz, „…”, udostępnij, zakładka (dodaj do półki).
2. Zdjęcie na szarym tle, „Marka | Kategoria”, nazwa, poziom ceny (zł zł zł zł).
3. **Karta dopasowania** w kolorze etykiety: „Nie pasuje — zawiera wyzwalacze trądziku grzybiczego” + okrąg z wynikiem; pod spodem punkty z kolorową kropką (opis produktu, plusy, minusy z pogrubioną nazwą składnika), „Pokaż jeszcze 2”. Tekst AI „Dlaczego” jako rozwinięcie.
4. **Alternatywy dla Ciebie** — karuzela lepiej dopasowanych produktów tej samej kategorii (u nas za darmo, bez rozmycia).
5. Kafelki **Porównaj** i **Podobne składy** (dupes = największe pokrycie składników).
6. **Co jest w środku** — siatka 2 kolumn z ✓ / ×: bez alkoholu, bez zapachów, bez silikonów, nie zapycha porów, bez alergenów UE, bez olejów, bez siarczanów, bez parabenów, bezpieczny przy trądziku grzybiczym, wegański, bezpieczny dla raf, bez testów na zwierzętach.
7. **Lista składników** — pasek proporcji (zielony / pomarańczowy / czerwony / szary), wiersze: kropla w kolorze oceny, nazwa, funkcja, ikonki (trądzik grzybiczy, różowaty, komedogenność „0/0”); pierwsze 5 + „Pokaż wszystkie 24”; „Zgłoś poprawkę”.
8. **Kluczowe składniki**, **Korzyści** (z liczbą składników, które je dają), **Zastrzeżenia** („Może nasilać AZS”).
9. Gdzie kupić (Hebe, Rossmann — link, jeśli mamy) — Could. Opinii nie ma.

### 6.4 Pozostałe ekrany szczegółów

| # | Ekran | Kluczowe elementy |
| --- | --- | --- |
| D2 | Karta składnika | Nazwa INCI i potoczna, funkcje (chipy), ocena dla Twojej skóry, flagi (trądzik grzybiczy, alergen UE, komedogenność), opis AI, „Produkty z tym składnikiem”, „Unikaj” |
| D3 | Analizuj skład | Pole na wklejony INCI → ten sam układ co D1 od punktu 3; lista nierozpoznanych |
| D4 | Skaner + „nie znaleziono” | Kamera z ramką, latarka; nieznany EAN → formularz zgłoszenia → D3 |
| D5 | Porównanie | 2 kolumny: wynik, cena, flagi „Co jest w środku”, składniki wspólne / tylko A / tylko B |
| D6 | Profil skóry | Wynik O14 + edycja odpowiedzi z quizu, ponowny quiz |
| D7 | Wykluczenia | Jak O15 + O16 |
| D8 | Ustawienia | Lista z ikonami jak w SkinSort, „Wyloguj” na czerwono |

### 6.5 Kluczowe przepływy

1. **Pierwsze uruchomienie:** O1 → O22 → T1. Konto dopiero na końcu — wyższa szansa dokończenia quizu.
2. **Skan w drogerii:** T2 (aparat) → EAN → D1 w mniej niż 1,5 s; tekst AI doczytuje się osobno. Nieznany kod → D4 → D3.
3. **Rutyna:** T3 → slot kroku → wybór z Półki lub wyszukiwarki → kontrola konfliktów → wynik rutyny na T1.
4. **Zmiana profilu:** D6 → zapis → przeliczenie wszystkich wyników (invalidacja zapytań).

## 7. System projektowy

Docelowy wygląd to SkinSort: białe i ciepło-szare tła, ciemny indygo na głównych przyciskach, jaskrawszy fiolet na ikonach i akcentach, duże pytania lekkim krojem, karty z cienką ramką i dużym zaokrągleniem, kolorowe pigułki dopasowania. Przejmujemy styl, nie markę: własna nazwa, logo i ikona (nie kolba, nie słowo „skinsort”), własne ilustracje.

### 7.1 Kolory (tokeny)

Wartości odczytane ze zrzutów ekranu — do potwierdzenia kontrastu WCAG AA w obu motywach.

| Token | Jasny | Ciemny | Użycie |
| --- | --- | --- | --- |
| `primary` | #2F2A7D | #A7A1F5 | Główny przycisk „Dalej”, zaznaczona karta (ramka 2 px), radio i checkbox, pasek postępu |
| `primaryDisabled` | #AEACCB | #3A3760 | Nieaktywny przycisk |
| `accent` | #4F46E5 | #8C82F2 | Ikony w chipach i listach, linki, „Dodaj produkty”, wynik w okręgu |
| `accentSoft` | #E7E5FB | #2A2650 | Podświetlenie słów („Match Score”), tło ekranu wyniku, karty „Dziś” |
| `background` | #FFFFFF | #0E0E12 | Onboarding, karta produktu, ustawienia |
| `backgroundAlt` | #F7F6F3 | #141418 | Dziś, Rutyna (ciepła szarość pod białymi kartami) |
| `surface` | #F3F3F1 | #1C1C22 | Tło zdjęcia produktu, zwinięty akordeon, wyszukiwarka |
| `border` | #E7E6E3 | #2C2C34 | Ramki kart odpowiedzi i kart produktów |
| `textPrimary` | #1C1C1E | #F5F5F7 | Treść, pytania |
| `textSecondary` | #6E6E73 | #A1A1AA | Podpisy, marka, opisy |
| `good` / `goodSoft` | #1F9D55 / #D5F5E1 | #3DD68C / #123A26 | „92% dopasowania”, ✓ w „Co jest w środku”, dobry składnik |
| `caution` / `cautionSoft` | #E07B12 / #FDE9C8 | #F5A94A / #3D2A10 | 50–74%, składnik z ostrożnością |
| `bad` / `badSoft` | #D93636 / #FDDCDC | #F06B6B / #3D1515 | „Nie pasuje”, ×, unikane składniki (chipy), słowo „unikać” w nagłówku |

### 7.2 Typografia

- Krój: **Inter** (OFL, polskie i ukraińskie znaki) — najbliższy darmowy odpowiednik kroju SkinSort; przez `expo-font`.
- Pytanie / nagłówek ekranu: 30/36 **Regular**, odstęp liter −1% (SkinSort nie używa tu bolda).
- Nagłówek sekcji („Oczyszczanie dla Ciebie”, „Lista składników”): 24/30 SemiBold.
- Nazwa produktu na karcie: 18/24 Medium; na D1: 30/36 SemiBold, wyśrodkowana.
- Treść i odpowiedzi: 17/24 Regular; wyróżnienie fragmentu odpowiedzi SemiBold („**Podrażnienia** po kosmetykach”).
- Podpis: 15/20 Regular `textSecondary`; etykieta: 12/16 SemiBold wersalikami.

### 7.3 Kształty i odstępy

- Siatka 4 pt, marginesy ekranu 20.
- Przycisk główny: pełna szerokość, wysokość 56, pełne zaokrąglenie, przyklejony do dołu nad cienką linią; drugorzędny: biały z ramką („Nie mam jeszcze”, „Pomiń”).
- Karta odpowiedzi: promień 20, ramka 1 `border`, padding 20; zaznaczona → ramka 2 `primary` + wypełnione radio / checkbox.
- Chip: pełne zaokrąglenie, ikona `accent` + tekst; unikany składnik → `badSoft` z „×”.
- Karta produktu: promień 24, zdjęcie na `surface`, pigułka dopasowania w lewym górnym rogu, serduszko / zakładka w prawym.
- Pasek zakładek: biały, cienka linia u góry, ikony liniowe, aktywna wypełniona i ciemniejsza. Bez rozmytego pływającego paska.
- Cienie prawie niewidoczne, tylko pod kartą opinii-zasady (O5) i arkuszami.

### 7.4 Komponenty (`src/components/ui`)

PrimaryButton, SecondaryButton, ProgressHeader (wstecz + pasek), QuestionScreen (szablon O6–O19), OptionCard (radio / checkbox, z ikoną i opisem), ChipSelect, ZoneAccordion (O8), SkinScale (skala sucha–tłusta z dymkiem „Ty”), DotMeter (bariera, wrażliwość), SearchBar (z ikoną aparatu), CategoryCircle, MatchPill, MatchCard (karta dopasowania z okręgiem), ScoreRing, ProductCard (karuzela i lista), FlagGrid („Co jest w środku”), IngredientBar (pasek proporcji), IngredientRow (kropla + funkcja + ikonki), BenefitRow, RoutineSlot, MoodPicker (5 buźk), WeekStrip, EmptyState, Confetti, Skeleton, Toast, BottomSheet.

### 7.5 Ikony i ilustracje

Ikony: Phosphor (warianty regular i fill — w SkinSort aktywna zakładka jest wypełniona). Ilustracje intro (O2–O4) i pustych stanów: miękkie, pastelowe butelki i plamy w odcieniach `accentSoft`, mięty i brzoskwini — własne (wygenerowane i poprawione), nie kopiowane. Zdjęcia produktów z bazy (Hebe / Open Beauty Facts) na `surface`. Elementy dotykowe min. 44 × 44 pt.

### 7.6 Makiety

Plik Figma z analizą jest dla mnie niedostępny. Przed sprintem 1 robimy makiety 6 kluczowych ekranów (O8, O14, T1, T2, D1, T3) z tymi tokenami i zatwierdzamy je, zanim powstanie kod; zrzuty idą do rozdziału o projektowaniu interfejsu.

## 8. Struktura repozytorium i API

Jedno repozytorium (monorepo pnpm) z czterema częściami: aplikacja mobilna, serwer API, współdzielony pakiet logiki oceny i generowany klient API. Kod piszemy w Claude Code; dziennik decyzji leży w repozytorium obok kodu.

```text
dermamind/
├─ apps/
│  ├─ mobile/                    # Expo (iOS + Android)
│  │  ├─ app/                    # Expo Router: (onboarding), (tabs), product/[id], ...
│  │  ├─ src/
│  │  │  ├─ components/ui/       # system projektowy (sekcja 7)
│  │  │  ├─ components/features/ # ProductCard, MatchCard, IngredientRow, ...
│  │  │  ├─ features/            # quiz, scan, search, routine, shelves, profile
│  │  │  ├─ lib/                 # queryClient, auth (secure-store), i18n, sentry
│  │  │  ├─ stores/              # zustand (stan quizu przed kontem)
│  │  │  ├─ theme/               # tokens.ts, typography.ts
│  │  │  └─ locales/             # pl.json, en.json, uk.json
│  │  ├─ e2e/                    # Maestro
│  │  └─ app.config.ts, eas.json # adres API per środowisko, bundle ID com.dermamind.app
│  ├─ api/                       # NestJS
│  │  ├─ src/
│  │  │  ├─ auth/  users/  catalog/  scoring/  routines/
│  │  │  ├─ shelves/  submissions/  ai/  app-config/  admin/
│  │  │  ├─ common/              # guardy, filtry błędów, throttling, logowanie
│  │  │  └─ main.ts              # prefiks /v1, Swagger pod /docs
│  │  ├─ prisma/                 # schema.prisma, migrations/, seed.ts
│  │  ├─ test/                   # testy endpointów (Jest + Supertest)
│  │  └─ Dockerfile
│  └─ admin/                     # (Could) panel admina
├─ packages/
│  ├─ scoring/                   # match score, quiz, parser INCI, konflikty + Vitest
│  └─ api-client/                # klient i typy generowane z OpenAPI (orval)
├─ scripts/                      # import-products.ts, normalize-inci.ts
├─ docs/
│  ├─ decisions/                 # ADR-001-stack.md, ADR-002-dane.md, ...
│  ├─ diagrams/                  # ERD, architektura (do pracy)
│  └─ thesis-notes.md
├─ docker-compose.yml            # lokalnie: PostgreSQL + API
└─ .github/workflows/            # ci.yml, deploy-api.yml
```

### 8.1 Kontrakt API (wywołania z aplikacji)

| Endpoint (REST, prefiks /v1) | Moduł | Opis |
| --- | --- | --- |
| `POST /auth/guest`, `/auth/register`, `/auth/login`, `/auth/apple`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/password/reset` | auth | Konto gościa na czas quizu, logowanie, łączenie gościa z kontem w O22 |
| `GET /me`, `PUT /me/quiz`, `PUT /me/avoided` | users | Profil; typ skóry, bariera i wrażliwość liczone na serwerze z odpowiedzi quizu |
| `GET /products?q=&category=&sort=&page=` | catalog + scoring | Lista z Match Score dla bieżącego profilu, kolekcje dla ekranu Odkrywaj |
| `GET /products/barcode/:ean` | catalog | Produkt albo 404 (→ D4) + wpis w historii skanów |
| `GET /products/:id` | catalog + scoring | Szczegóły, składniki z oceną, wynik, flagi, alternatywy |
| `POST /analyze` | scoring + ai | Wklejony skład INCI → wynik; parser AI jako zapas |
| `GET /ingredients?q=`, `GET /ingredients/:id` | catalog | Wyszukiwanie odporne na literówki (pg\_trgm), karta składnika |
| `GET/POST/DELETE /me/shelves/...` | shelves | Półki Mam, Lubię, Unikam |
| `GET/PUT /me/routines`, `POST /me/routines/generate` | routines + ai | Rutyna, wynik rutyny, generowanie AI z walidacją regułami |
| `GET /ai/ingredients/:id/explain`, `GET /ai/products/:id/summary` | ai | Teksty AI z cache, limit dzienny |
| `POST /submissions` | submissions | Zgłoszenie nieznanego produktu |
| `GET /me/export`, `DELETE /me` | users | RODO + wymóg sklepów: eksport i usunięcie konta |
| `GET /app-config` | app-config | Minimalna wersja aplikacji, przełączniki funkcji |

### 8.2 Konwencje

- TypeScript strict, ESLint + Prettier, Conventional Commits, chroniona gałąź `main`, PR na każdą funkcję z review innej osoby z zespołu.
- Kontrakt API: OpenAPI generowany przez NestJS → `packages/api-client` regenerowany w CI; żadnych ręcznie pisanych typów odpowiedzi.
- Każdy ADR w `docs/decisions/`: kontekst, rozważane opcje, decyzja, konsekwencje. To surowiec do rozdziału o projekcie systemu, pisany na bieżąco własnymi słowami.

## 9. Harmonogram sprintów

9 sprintów po 2 tygodnie od 12 października 2026: funkcje zamknięte 31 stycznia 2027, aplikacja w sklepach 28 lutego, marzec na bufor, pracę pisemną i przygotowanie obrony. Przy rytmie 2 dni w tygodniu sprint to ok. 4 dni robocze, więc zakres każdego jest celowo wąski.

&#91;embedded content: harmonogram · 9 sprintów, 2 kamienie milowe\]

Każdy sprint kończy się działającą wersją na telefonie (EAS Update) i wpisem w dzienniku decyzji.

### Sprint 0 — fundamenty (12–25 paź)

- [ ] Akceptacja planu przez promotora; konta Apple Developer i Google Play; identyfikator `com.dermamind.app`
- [ ] Monorepo: `apps/mobile` (Expo), `apps/api` (NestJS), `packages/scoring`; ESLint, CI w GitHub Actions
- [ ] PostgreSQL w docker-compose, `schema.prisma` z sekcji 3, migracje, seed z danymi Sa.Sha
- [ ] Deploy staging API (Docker, HTTPS, region UE) z `/v1/app-config` i Swaggerem pod `/docs`
- [ ] Import 42 produktów z Hebe, normalizacja INCI, raport nieznanych składników
- [ ] Tokeny projektowe, komponenty bazowe, makiety 6 kluczowych ekranów
- [ ] ADR-001 (stack i własny serwer), ADR-002 (model danych), przydział modułów w zespole

### Sprint 1 — konto i quiz (26 paź – 8 lis)

- [ ] Ekrany intro O1–O5; moduł `auth`: konto gościa, e-mail, Apple, Google, refresh, reset hasła (O22)
- [ ] Quiz O6–O13 (QuestionScreen, ZoneAccordion), wyliczenie typu skóry, bariery i wrażliwości z testami, ekran wyniku O14
- [ ] Preferencje O15–O21, ekran „profil gotowy”, lokalny stan quizu i `PUT /v1/me/quiz` po zalogowaniu
- [ ] Nawigacja zakładek, Profil (szkielet), wygenerowany klient API w aplikacji

### Sprint 2 — algorytm i katalog (9–22 lis)

- [ ] `packages/scoring` + moduł `scoring` serwera; testy Vitest i testy endpointów
- [ ] `GET /v1/products` z wynikiem, ekran Odkrywaj z filtrami i pigułką dopasowania
- [ ] Karta produktu D1 (bez tekstu AI): MatchCard, IngredientRow, FlagGrid
- [ ] Uzupełnienie `ingredient_effects` dla 80 najczęstszych składników

### Sprint 3 — skaner i analiza składu (23 lis – 6 gru)

- [ ] Skaner EAN (expo-camera), historia skanów
- [ ] Nie znaleziono D4 + zgłoszenie produktu
- [ ] Parser INCI i ekran D3, karta składnika D2 (bez AI)
- [ ] Import kodów EAN z Open Beauty Facts

### Sprint 4 — funkcje AI (7–20 gru)

- [ ] Moduł `ai` serwera: opisy składników, „Dlaczego taki wynik”, parser INCI — z cache i limitami
- [ ] „Dlaczego taki wynik” w D1, opis AI w D2
- [ ] Rekrutacja 12+ testerów do zamkniętych testów Google Play

### Sprint 5 — rutyna i ulubione (4–17 sty)

- [ ] `ai-routine` + walidacja regułami, ekran Rutyna T4, „Dodaj do rutyny” z D1
- [ ] Konflikty składników (F12), ulubione i historia (F10)
- [ ] Ekran Start T1 z rekomendacjami

### Sprint 6 — dopracowanie i dane (18–31 sty, feature freeze)

- [ ] Porównanie D5, i18n PL/EN/UA, tryb ciemny, dostępność
- [ ] Baza do min. 150 produktów, kalibracja wag na 20 parach testowych
- [ ] Usunięcie konta i eksport danych (RODO), polityka prywatności na azenko.dev

### Sprint 7 — testy i beta (1–14 lut)

- [ ] Maestro E2E dla 5 przepływów, Sentry, poprawki błędów
- [ ] TestFlight + zamknięte testy Google Play (start 14-dniowego okresu)
- [ ] Testy użyteczności z 8–10 osobami, ankieta SUS

### Sprint 8 — publikacja (15–28 lut)

- [ ] Zrzuty ekranu, opisy, formularze prywatności, wysyłka do recenzji obu sklepów
- [ ] Poprawki po recenzji, wersja 1.0 w sklepach
- [ ] Zamrożenie repozytorium na tag `v1.0.0` jako wersja do pracy

## 10. Testy, jakość, wdrożenie i publikacja

Cel jakościowy na obronę: zero awarii w głównych przepływach, testy automatyczne logiki oceny z pokryciem min. 90%, aplikacja dostępna w TestFlight i Google Play (testy zamknięte lub produkcja).

### 10.1 Piramida testów

| Poziom | Narzędzie | Co testujemy | Próg |
| --- | --- | --- | --- |
| Jednostkowe | Vitest | `packages/scoring`: match score, quiz, parser INCI, konflikty; serwisy serwera | Pokrycie scoring ≥ 90% |
| API | Jest + Supertest na PostgreSQL w kontenerze | Każdy endpoint: poprawne dane, walidacja, autoryzacja (użytkownik A nie widzi danych B), limity, moduł ai z atrapą Claude | Wszystkie zielone |
| Kontrakt | Generacja OpenAPI w CI | Klient w aplikacji zgodny z serwerem | Brak różnic |
| Komponenty | Jest + RNTL | MatchCard, IngredientRow, formularze, stany puste i błędu | Kluczowe komponenty |
| E2E | Maestro | 4 przepływy z sekcji 6.5 na emulatorze Androida i symulatorze iOS przeciw API staging | Przed każdym wydaniem |
| Użyteczność | Testy z 8–10 osobami | Zadania: onboarding, skan, rutyna; czas, błędy, ankieta SUS | SUS ≥ 70 |
| Regresja algorytmu | Zestaw 20 par profil–produkt (sekcja 4.5) | Zgodność etykiet z oceną ekspercką | ≥ 80% |

### 10.2 CI/CD

1. Każdy PR: lint, typecheck, Vitest, testy API na PostgreSQL w kontenerze, regeneracja klienta OpenAPI (błąd przy niezgodności).
2. Merge do `main`: build obrazu Docker, migracje Prisma i deploy API na staging, EAS Update (OTA) aplikacji na kanał `preview`.
3. Tag `v*`: deploy API na production (migracje przed startem nowej wersji), EAS Build produkcyjny, EAS Submit do App Store Connect i Google Play.

### 10.3 Środowiska

Dwa środowiska, `staging` i `production`: osobne bazy, osobne adresy API (np. `api-staging.…` i `api.…`), automatyczne kopie zapasowe bazy. Sekrety (klucz Claude, `JWT_SECRET`, hasło bazy, klucze Apple/Google) w ustawieniach hostingu i GitHub Actions, nigdy w repozytorium. Aplikacja zna tylko adres API, ustawiany w EAS osobno dla każdego kanału.

### 10.4 Publikacja w sklepach

- Konta: Apple Developer (99 USD/rok) i Google Play Console (25 USD jednorazowo) — założyć w sprincie 0, bo weryfikacja trwa do kilku dni.
- Google Play dla nowych kont osobistych wymaga zamkniętych testów z min. 12 testerami przez 14 dni przed produkcją — zaplanowane w sprincie 7 (sprawdzić aktualne wymagania Google przed startem).
- Wymagane materiały: polityka prywatności (strona na azenko.dev), opis PL/EN, zrzuty ekranu 6.7" i 6.5" (iOS) oraz telefon (Android), ikona 1024 × 1024, formularz „App Privacy” / „Data safety”.
- Kategoria: Zdrowie i fitness lub Uroda; w opisie wyraźnie: aplikacja informacyjna, nie medyczna.

### 10.5 RODO i prywatność

Dane o skórze traktujemy jak potencjalnie wrażliwe: zgoda przy onboardingu, eksport danych (JSON) i usunięcie konta z poziomu aplikacji, minimalizacja danych wysyłanych do API AI, serwer i baza w regionie UE.

## 11. Powiązanie z dokumentacją dyplomową

Każdy etap kodu zostawia materiał do konkretnego rozdziału pracy, więc dokumentacja rośnie razem z aplikacją, a nie jest pisana na końcu. Notatki do pracy piszesz sam, na bazie ADR-ów i wyników testów — wtedy tekst nie brzmi jak wygenerowany.

| Rozdział pracy (proponowany) | Źródło w projekcie | Kiedy gotowe |
| --- | --- | --- |
| Wstęp, cel i zakres | Sekcja 1 tego planu | Sprint 0 |
| Analiza istniejących rozwiązań | Dokument „Research” (gotowy) + porównanie funkcji w tabeli | Gotowe |
| Wymagania funkcjonalne i niefunkcjonalne | Tabela F1–F14, sekcje 5.1, 10.5 | Sprint 0 |
| Projekt systemu: architektura, baza danych (ERD) | Sekcje 2–3, `docs/diagrams`, ADR-001…003 | Sprint 1 |
| Algorytm dopasowania | Sekcja 4, testy, wyniki kalibracji | Sprint 6 |
| Wykorzystanie AI | Sekcja 5, prompty, przykłady odpowiedzi, koszty | Sprint 4 |
| Projekt interfejsu | Sekcje 6–7, makiety, zrzuty | Sprint 1 + aktualizacje |
| Implementacja (wybrane fragmenty kodu) | Repozytorium | Sprint 7 |
| Testy i ewaluacja (w tym SUS) | Sekcja 10.1, raporty | Sprint 7 |
| Wdrożenie i publikacja | Sekcja 10.4 | Sprint 8 |
| Podsumowanie, kierunki rozwoju | Sekcja 12 + backlog | Sprint 8 |

Struktura rozdziałów do potwierdzenia ze wzorem wymagań uczelni (CDV) — po jego otrzymaniu dopasujemy tabelę.

## 12. Ryzyka i otwarte pytania

Największe ryzyko to nie kod, tylko dane: algorytm jest tak dobry, jak tabela `ingredient_effects`. Dlatego uzupełnianie danych startuje w sprincie 0 i biegnie równolegle do końca.

### 12.1 Ryzyka

| Ryzyko | Skutek | Zapobieganie / plan B |
| --- | --- | --- |
| Za mało danych o efektach składników | Niskie zaufanie do wyniku, dużo `low_confidence` | Zacząć od 80 najczęstszych składników (pokrywają większość składów); CosIng + literatura; przypisy w kolumnie `evidence` |
| Mało produktów z kodem EAN | Skaner często trafia w „nie znaleziono” | Import z Open Beauty Facts; przepływ D4 → D3 daje wartość nawet bez produktu w bazie |
| Opóźnienie przez rytm pracy (2 dni w tygodniu) | Przesunięcie publikacji | Funkcje Should/Could do odcięcia; feature freeze na sztywno (sprint 6) |
| Weryfikacja w Google Play (12 testerów, 14 dni) | Brak wersji produkcyjnej na obronę | Rekrutacja testerów ze studiów w grudniu; w razie czego obrona na wersji testowej |
| Koszty Claude API | Rachunek przy testach | Cache, limity dzienne, tańszy model do opisów |
| Odpowiedź AI brzmi jak porada medyczna | Problem etyczny i z recenzją w sklepie | Prompt + stały disclaimer z i18n + test treści |
| Zmiana wymagań promotora | Przebudowa zakresu | Ten plan do akceptacji promotora w sprincie 0 |

### 12.2 Otwarte pytania

- [x] Nazwa: DermaMind AI (decyzja 11.10.2026) — sprawdzić dostępność w App Store i Google Play.
- [x] Zespół: 4 osoby; Sa.Sha to Oleksandr (autor schematu bazy).
- [x] Backend: własny serwer API (sekcja 2).
- [ ] Imiona i role pozostałych 3 osób (sekcja 14.2).
- [ ] Dane Hebe (42 produkty) jako plik CSV / JSON / Excel.
- [ ] Plik `final_db (1).sql` z pełniejszym schematem (`skin_problems`, `ingredient_effects`), jeśli się zachował.
- [ ] Wzór wymagań dokumentacji z CDV i termin złożenia pracy.
- [ ] Hosting API: Railway czy Render i na czyje konto (koszt miesięczny do sprawdzenia).
- [ ] Dostęp do pliku Figma „Skincare App — Research” (do odczytu).
- [ ] Konsultacja kosmetologa do kalibracji algorytmu.

### 12.3 Po MVP (kierunki rozwoju do pracy)

OCR etykiety (skład ze zdjęcia opakowania, nie skóry), dziennik pielęgnacji bez zdjęć, porównanie cen między drogeriami, panel admina z moderacją zgłoszeń, rekomendacje „zamiennik tańszy”.

## 13. Wersja beta i strony projektu: co bierzemy, co odrzucamy

Beta to dopracowany interfejs na danych testowych: 14 ekranów, 3 języki i 19 testów, ale bez prawdziwej bazy produktów i bez algorytmu — wynik dopasowania jest wpisany na sztywno w `mock-data.ts`. Bierzemy z niej układ ekranów i doświadczenia z UX, a cały backend i dane piszemy od nowa według sekcji 2–4.

### 13.1 Co jest w materiałach

| Materiał | Co zawiera | Stan |
| --- | --- | --- |
| `skin-ai-mobile (2)` (aplikacja beta) | Expo Router, NativeWind, tRPC + Drizzle (MySQL), szablon Manus (OAuth, storage, runtime). Ekrany: powitanie, logowanie, rejestracja, quiz (5 pytań), Start, Produkty, Ulubione, Analiza (zdjęcie), Ustawienia, karta produktu, edycja profilu | UI w większości gotowe; dane: 8 produktów i 8 składników testowych; baza ma tylko `users` i `profiles` |
| `sait_skin_ai` (strona) | Vite + React 19, Tailwind 4, three.js (cząsteczki), GSAP, motion; różowo-niebieska paleta, Playfair Display + Inter; EN/PL/UA | Strona promocyjna z 6 przykładowymi produktami (marki z USA, ceny w dolarach) |
| [duplom-1.netlify.app](https://duplom-1.netlify.app/) „PCA Skin AI” | Landing: analiza zdjęć, czat AI (symulowany), opinie użytkowników, plany Free / Pro 19 $ / Premium 39 $ | Treści demonstracyjne |
| [v0-personalized-cosmetic-app.vercel.app](https://v0-personalized-cosmetic-app.vercel.app/) „SkinGlow” | Opis projektu dyplomowego: problem, cel, problem badawczy, grupa docelowa, 7 funkcji, architektura, zespół 4 osób | Tekst bez polskich znaków; zakres funkcji zgodny z tym planem |

### 13.2 Bierzemy z bety

- **Układ karty produktu** (`app/product/[id].tsx`): sekcje analiza składników, wynik z wyjaśnieniem, kluczowe korzyści, ostrzeżenia, modal składnika — przenosimy na D1/D2 z nowym systemem projektowym.
- **Trzy poziomy ryzyka** safe / caution / avoid → odpowiadają naszym kolorom good / caution / bad w liście składników.
- **Quiz**: pytania o typ skóry, problemy, wrażliwość (3 poziomy) i liczbę kroków pielęgnacji. Nowość z bety do planu: **pytanie o budżet** — w złotówkach (do 30 / 30–70 / 70–150 / powyżej 150 zł), zapis w `profiles.budget`, użycie jako filtr przy rekomendacjach i rutynie.
- **Ustawienia**: podsumowanie profilu, ponowny quiz, przełącznik języka, tryb ciemny, wylogowanie, sekcja o aplikacji.
- **Klucze tłumaczeń** EN/PL/UA i testy kompletności tłumaczeń (każdy klucz EN istnieje w PL i UA).
- **Pomysły testów** z `tests/app-core.test.ts` (klasyfikacja składników, sortowanie po wyniku, logika ulubionych) — przepisujemy pod `packages/scoring`.
- **Ze strony SkinGlow**: problem badawczy i opis grupy docelowej nadają się do wstępu pracy (po poprawieniu polskich znaków).

### 13.3 Odrzucamy i dlaczego

| Element bety | Powód | Zamiennik w planie |
| --- | --- | --- |
| Analiza zdjęcia skóry (`skin-analysis.ts`, zakładka Analiza) | Poza zakresem; Claude jako „dermatolog” oceniający zdjęcie to ryzyko porady medycznej | Analiza wklejonego składu (D3) + skaner kodu (T3) |
| Szablon Manus (`server/_core`, `manus-runtime`, OAuth Manus) | Zależność od zewnętrznej platformy, kod, którego nie napisaliśmy i nie obronimy | Własny moduł auth serwera (JWT, Apple, Google) |
| MySQL + Drizzle, sesje w cookies | Rozbieżność z bazą PostgreSQL Sa.Sha; cookies słabo działają w aplikacji mobilnej | Własny serwer NestJS + PostgreSQL (Prisma), tokeny w `expo-secure-store` |
| `mock-data.ts` z wpisanym `compatibility` | Wynik nie wynika z danych — nie do obrony | `compute_match_score()` (sekcja 4) |
| Oceny i liczba recenzji produktów | Brak źródła danych, funkcje społecznościowe poza zakresem | Usunięte |
| Opinie użytkowników i plany płatne na stronie netlify | Opinie są wymyślone, a płatności kłócą się z zasadą „wszystko darmowe” z analizy rynku | Strona projektu bez opinii i cennika (sekcja 13.5) |
| Paleta „dusty rose” bety i różowo-niebieska strony | Docelowy kierunek wizualny to SkinSort | Tokeny z sekcji 7 |

### 13.4 Do posprzątania przed nowym repozytorium

- W archiwum bety jest plik `.env` z ustawioną zmienną `ANTHROPIC_API_KEY`. Jeśli to prawdziwy klucz — unieważnić go w konsoli Anthropic i nie przenosić `.env` do nowego repozytorium ani archiwów.
- Model w `skin-analysis.ts` jest wpisany na sztywno w kodzie — w nowej wersji nazwy modeli tylko w zmiennych środowiskowych (sekcja 5.1).
- Duplikaty w becie (`components/ui/ui/`, `assets/assets/`) i pusty plik `flutter` — nie kopiujemy.

W tym samym archiwum leży też `.project-config.json` z danymi dostępowymi szablonu Manus: adres bazy MySQL z hasłem, klucze AWS (wygasłe w maju 2026), `JWT_SECRET` i klucze API platformy. To ten sam plik, który w lipcu zablokował push na GitHub. Archiwum nie udostępniać dalej, hasło do bazy uznać za spalone, a plik wpisać do `.gitignore` od pierwszego commita nowego repozytorium.

### 13.5 Strona projektu

Jedna strona zamiast trzech: link do pobrania z App Store i Google Play, opis funkcji, polityka prywatności (wymagana przez sklepy, sekcja 10.4), kontakt. Bazą może być `sait_skin_ai` (gotowe i18n i animacje) po zmianie palety na tokeny z sekcji 7 i usunięciu przykładowych produktów z USA. Hosting: Vercel, domena azenko.dev lub subdomena. Dodajemy jako zadanie do sprintu 8.

## 14. Zgodność z propozycją projektu dyplomowego

Plan pokrywa wszystkie 7 funkcji i 4 komponenty z oficjalnej propozycji projektu; nic z niej nie wypada. Dodatki (skaner, analiza wklejonego składu, rutyna, wykluczenia, konflikty) rozszerzają zakres zgodnie z wnioskami analizy rynku i trzeba je omówić z promotorem jako rozwinięcie propozycji.

### 14.1 Propozycja → plan

| Punkt propozycji | Gdzie w planie |
| --- | --- |
| Rejestracja i profil użytkownika | F1, O1–O2, `profiles` |
| Ankieta stanu skóry (typ, problemy, wrażliwość, preferencje pielęgnacji) | F2, O3–O6, `quiz_answers`, `profile_concerns` |
| Baza produktów i składników (nazwa, marka, kategoria, składniki, właściwości) | Sekcja 3.2 |
| Analiza składników: korzystne / drażniące przy danych problemach | `ingredient_effects`, sekcja 4, D2 |
| System rekomendacji: korzystne składniki, brak szkodliwych, zgodność z problemami | Match Score (sekcja 4), T1 „Dobrane dla Ciebie”, sortowanie w T2 |
| Szczegóły produktu: składniki, opis aktywów, uzasadnienie rekomendacji | D1 + `ai-product-summary` |
| Lista ulubionych | F10, D8 |
| Komponenty: aplikacja, backend, baza, moduł rekomendacji | Sekcja 2 (backend = serwer API NestJS, moduł = `compute_match_score` + `packages/scoring`) |
| „Elementy sztucznej inteligencji” | Sekcja 5: AI tłumaczy wynik, opisuje składniki i układa rutynę; dopasowanie liczy algorytm |
| Strona reklamowa (zakres zespołu) | Sekcja 13.5 |

**Problem badawczy** z propozycji („czy system na podstawie danych użytkownika i bazy składników wygeneruje trafne rekomendacje?”) wymaga mierzalnej odpowiedzi. Daje ją kalibracja z sekcji 4.5 (zgodność z oceną ekspercką ≥ 80%) i ankieta SUS z sekcji 10.1 — to główny wynik rozdziału badawczego.

**Backend:** propozycja mówi o „serwerze obsługującym logikę aplikacji” — realizujemy to dosłownie: własny serwer API (NestJS) z bazą PostgreSQL, modułem rekomendacji i integracją AI (decyzja 11.10.2026, sekcja 2).

### 14.2 Podział pracy w zespole 4 osób (propozycja)

Propozycja zakłada zespół 4 osób. Jeśli tak zostaje, podział po obszarach planu, z których każdy daje osobny rozdział do opisania w pracy:

| Osoba | Obszar | Sekcje planu |
| --- | --- | --- |
| Oleksandr (Sa.Sha) — lider techniczny | Architektura, serwer API (auth, catalog, scoring), baza danych i Prisma, CI/CD, deploy, publikacja w sklepach | 2, 3, 8, 10 |
| Osoba 2 | Aplikacja mobilna: onboarding, ekrany, połączenie z API | 6, 7.4 |
| Osoba 3 | Dane i algorytm: `ingredient_effects` ze źródłami, import produktów, kalibracja, moduł ai | 3.5, 4, 5 |
| Osoba 4 (np. autorka analizy rynku) | Projekt UI w Figmie, strona reklamowa, materiały do sklepów, testy użyteczności SUS | 7, 10.1, 10.4, 13.5 |

Osoby 2–4 do uzupełnienia imionami. Podział po modułach serwera i ekranach daje każdemu własne PR-y w repozytorium i własny rozdział do opisania w pracy. Harmonogram z sekcji 9 był liczony dla jednej osoby 2 dni w tygodniu — przy 4 osobach zostaje zapas na funkcje „Could” (panel admina, OCR etykiety).
