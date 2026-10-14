# Raport importu katalogu

Wygenerowano: 2026-10-14 przez `pnpm import:catalog`. Plik jest nadpisywany przy każdym imporcie.

## Liczby

| Co | Ile |
| --- | --- |
| Marki | 4 |
| Produkty | 42 |
| — z pełnym składem INCI | 30 |
| — tylko kluczowe składniki (niekompletne) | 12 |
| — z kodem EAN (`data/barcodes.json`) | 0 |
| Składniki w bazie | 387 |
| Usunięte nieużywane składniki z poprzednich importów | 0 |
| Aliasy (warianty nazw, PL/EN) | 618 |
| Powiązania produkt–składnik | 932 |
| Wpływy składników na problemy skóry | 35 |
| Przypisania do grup unikania | 94 |
| Pary konfliktowych składników (`catalog/conflicts.ts`) | 30 |

## Nieznane składniki

Nazwy z pełnych składów, których nie ma w słowniku (`scripts/catalog/dictionary.ts`). Są w bazie, ale bez
funkcji, flag i wpływów — liczą się do „niepełnych danych” w Match Score.

Brak.

## Źródła pełnych składów i weryfikacja

Źródła: skinsort.com (27), notino.pl (3).

Import porównuje każdy pełny skład z kluczowymi składnikami z bazy Sa.Shy (ich pozycje pochodzą
z Hebe):

- **zgodny** — wszystkie na tych samych pozycjach: 7
- **przesunięty** — ta sama kolejność, przesunięcie o najwyżej 2 (lista w innym sklepie ma
  składnik więcej lub mniej): 11
- **rozbieżny** — składnika brak, inna kolejność albo duże przesunięcie; prawdopodobnie inna wersja
  receptury, sprawdzić z opakowaniem: 12

| Produkt | Źródło | Wynik | Różnice (składnik: Sa.Sha → pełny skład) | Notatka z inci_full.json |
| --- | --- | --- | --- | --- |
| Bielenda Hydro Lipidium Serum | [skinsort.com](https://skinsort.com/products/bielenda/hydro-lipidium-moisturizing-soothing-barrier-serum) | **rozbieżny** | TOCOPHEROL: 38 → 42; CITRIC ACID: 39 → 41 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| Nacomi Antibacterial Gel | [skinsort.com](https://skinsort.com/products/nacomi/niacinamide-face-cleansing-gel) | **rozbieżny** | CITRIC ACID: 20 → 16; PARFUM: 31 → 30 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| Nacomi Moisturizing Cream | [notino.pl](https://www.notino.pl/nacomi/next-level-dermo-nawilzajacy-krem-do-twarzy/) | **rozbieżny** | SODIUM HYALURONATE: 29 → 26; PARFUM: 42 → 41 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Nacomi Peptides Serum | [skinsort.com](https://skinsort.com/products/nacomi/next-level-lift-it-up-peptide-serum-10) | **rozbieżny** | CITRIC ACID: 16 → 21; SODIUM HYALURONATE: 6 → brak | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Centella Foam | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-ampoule-foam) | **rozbieżny** | CENTELLA ASIATICA EXTRACT: 1 → 6; CITRIC ACID: 13 → 12; SODIUM HYALURONATE: 20 → 21 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Poremizing Serum | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-poremizing-fresh-ampoule) | **rozbieżny** | CENTELLA ASIATICA EXTRACT: 1 → 6; PANTHENOL: 11 → 12; ALOE BARBADENSIS LEAF JUICE: 6 → brak; SODIUM HYALURONATE: 21 → 20 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Probio-Cica Serum | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-probio-cica-intensive-ampoule) | **rozbieżny** | CENTELLA ASIATICA EXTRACT: 1 → 9; NIACINAMIDE: 7 → 6; ALLANTOIN: 17 → 18; PANTHENOL: 18 → 17; SODIUM HYALURONATE: 32 → 28; CERAMIDE NP: 33 → 31 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Centella Cream | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-soothing-cream) | **rozbieżny** | CENTELLA ASIATICA EXTRACT: 1 → 6; SODIUM HYALURONATE: 27 → 28; CERAMIDE NP: 30 → 34 | 2 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Probio-Cica Cream | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-probio-cica-enrich-cream) | **rozbieżny** | BUTYROSPERMUM PARKII BUTTER: 18 → 20; SQUALANE: 24 → 28; SODIUM HYALURONATE: 35 → 40; CERAMIDE NP: 38 → 43 | 3 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Poremizing Cream | [skinsort.com](https://skinsort.com/products/skin-1004/poremizing-light-gel-cream) | **rozbieżny** | ALOE BARBADENSIS LEAF JUICE: 4 → brak; BETAINE: 13 → 14; PANTHENOL: 31 → 32; SODIUM HYALURONATE: 34 → 36; ALLANTOIN: 45 → 49 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| SKIN1004 Hyalu-Cica Toner | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-hyalu-cica-brightening-toner) | **rozbieżny** | CENTELLA ASIATICA EXTRACT: 1 → brak; NIACINAMIDE: 4 → 5; BETAINE: 6 → 7; SODIUM HYALURONATE: 7 → 8; HYALURONIC ACID: 9 → 10 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| SKIN1004 Probio-Cica Toner | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-probio-cica-essence-toner) | **rozbieżny** | SODIUM HYALURONATE: 28 → 31; BETAINE: 31 → 32; CITRIC ACID: 18 → 19 | 1 rozbieżności z bazą Sa.Shy — sprawdzić z opakowaniem |
| Bielenda Hydro Lipidium Barrier Cream | [skinsort.com](https://skinsort.com/products/bielenda/hydro-lipidium-high-lipid-barrier-cream-strongly) | przesunięty | CENTELLA ASIATICA EXTRACT: 17 → 16; CERAMIDE NP: 25 → 24 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Nacomi Cleansing Emulsion | [skinsort.com](https://skinsort.com/products/nacomi/ceramides-face-cleansing-lotion) | przesunięty | CERAMIDE NP: 17 → 16; TOCOPHEROL: 20 → 19; CITRIC ACID: 31 → 32; PARFUM: 44 → 43 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Nacomi Acne Cream | [notino.pl](https://www.notino.pl/nacomi/next-level-dermo-lekki-krem-przeciwtradzikowy-regulujacy-produkcje-sebum/) | przesunięty | PARFUM: 17 → 19 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Nacomi Salicylic Acid Serum | [skinsort.com](https://skinsort.com/products/nacomi/no-more-pores-salicylic-acid-serum-2) | przesunięty | NIACINAMIDE: 3 → 2; GLYCERIN: 4 → 3; SALICYLIC ACID: 5 → 4 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Nacomi Azeloglycine Serum | [skinsort.com](https://skinsort.com/products/nacomi/azeloglycine-5) | przesunięty | SODIUM HYALURONATE: 19 → 20; CITRIC ACID: 29 → 30 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| SKIN1004 Centella Cleansing Oil | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-light-cleansing-oil) | przesunięty | CENTELLA ASIATICA EXTRACT: 4 → 6 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| SKIN1004 PHA Toner | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-toning-toner) | przesunięty | BETAINE: 12 → 13; HYALURONIC ACID: 13 → 14 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| SKIN1004 Poremizing Toner | [skinsort.com](https://skinsort.com/products/skin-1004/madagascar-centella-poremizing-clear-toner) | przesunięty | SODIUM HYALURONATE: 18 → 19; ALLANTOIN: 19 → 20; CITRIC ACID: 20 → 21; SALICYLIC ACID: 23 → 25; GLYCOLIC ACID: 24 → 26 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Pharmaceris T Comedo Acne | [skinsort.com](https://skinsort.com/products/pharmaceris/anti-comedone-cream) | przesunięty | PARFUM: 20 → 19 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Pharmaceris Puri-Sensilium | [skinsort.com](https://skinsort.com/products/pharmaceris/a-puri-sensilium-calming-cleansing-face-foam) | przesunięty | CITRIC ACID: 18 → 19 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |
| Pharmaceris R Puri-Rosalgin | [skinsort.com](https://skinsort.com/products/pharmaceris/puri-rosalgin-soothing-physiological-face-gel-wash) | przesunięty | GLYCERIN: 8 → 9; CITRIC ACID: 9 → 10 | zweryfikowane z kluczowymi pozycjami z bazy Sa.Shy |

## Produkty z niekompletnym składem

Znamy tylko kluczowe składniki z bazy Sa.Shy (z prawdziwą pozycją w składzie). Flagi „Co jest w środku”
pokazujemy dla nich jako „brak danych”, a wynik jako niepewny. Uzupełnienie: `data/inci_missing.md`.

| Produkt | Znane składniki |
| --- | --- |
| Bielenda Hydro Lipidium SPF50 | 9 |
| Bielenda Skin Clinic Soothing Cream | 9 |
| Nacomi Oily Skin Toner | 7 |
| SKIN1004 Hyalu-Cica SPF50 | 5 |
| Pharmaceris PURI-SEBOGEL | 5 |
| Pharmaceris PURI-SEBOSTATIC | 6 |
| Pharmaceris PURI-SEBOTONIQUE | 3 |
| Pharmaceris Physiopuric-Gel | 8 |
| Pharmaceris Corneo-Sensilium | 5 |
| Pharmaceris Vita-Sensilium SPF30 | 6 |
| Pharmaceris R Lipo-Rosalgin | 4 |
| Pharmaceris R Calm-Rosalgin | 7 |
