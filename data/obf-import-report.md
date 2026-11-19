# Import Open Beauty Facts

Wygenerowano: 2026-11-19 13:33 UTC · zrzut z 2026-11-19 · skrypt `pnpm catalog:import-obf`

Dane: Open Beauty Facts (https://world.openbeautyfacts.org), licencja ODbL 1.0.

## Liczby

| | Liczba |
| --- | ---: |
| Przeczytane rekordy | 80784 |
| Zachowane (EAN + skład + UE) | 12837 |
| — w tym rynek polski (en:poland) | 219 |
| Nowe w bazie | 0 |
| Zaktualizowane | 0 |
| Bez zmian (ten sam last_modified_t) | 12837 |
| Pominięte razem | 67947 |
| Produkty OBF w bazie po imporcie | 12839 (rynek PL: 219) |

## Pominięte — powody

| Powód | Liczba |
| --- | ---: |
| uszkodzona linia JSON | 0 |
| brak poprawnego EAN-8/EAN-13 (suma kontrolna) | 2199 |
| brak listy składników | 54935 |
| brak kraju UE w countries_tags | 10026 |
| brak nazwy produktu | 787 |
| ten sam EAN drugi raz w zrzucie | 0 |
| EAN jest już w naszym katalogu (curated wygrywa) | 0 |
| EAN należy do produktu użytkownika | 0 |

## Kategorie (heurystyka z categories_tags)

| Kategoria | Liczba |
| --- | ---: |
| other | 7643 |
| body_care | 1813 |
| hair_care | 1221 |
| oral_care | 627 |
| deodorant | 556 |
| makeup | 372 |
| sunscreen | 230 |
| moisturizer | 192 |
| cleanser | 82 |
| mask | 67 |
| exfoliant | 13 |
| serum | 13 |
| eye_cream | 4 |
| toner | 4 |

## Rozpoznawanie składników (wszystkie produkty OBF w bazie)

- Nazw na listach: 223400, rozpoznanych w naszym słowniku: 202171 (90.5%).
- Produkty z w pełni rozpoznanym składem: 6478 z 12839.
- Nierozpoznane nazwy zapisujemy dosłownie w `products.inci_unknown` — bez zgadywania.
  Wynik dopasowania liczy je jako nieznane, więc ma niższą pewność.

## Rozpoznawanie składników — przed i po

Produkty Open Beauty Facts w bazie; nazwa = jedna pozycja listy INCI po parserze.
„Rozmyte” = dopasowane z tolerancją literówek (wysoki próg, oznaczone jako niska pewność).

| Krok | Rozpoznane nazwy | w tym rozmyte | Produkty w pełni rozpoznane | …bez rozmytych | Słownik: składniki / aliasy |
| --- | ---: | ---: | ---: | ---: | ---: |
| Start (D-59) | 56.1% | 0.0% | 265 (2.1%) | 265 | 387 / 618 |
| 1. Taksonomia OBF | 83.6% (+27.4 pp) | 0.0% | 2571 (20.0%) | 2571 | 22378 / 29302 |
| 2. Załączniki CosIng II–VI | 84.1% (+0.5 pp) | 0.0% | 2755 (21.5%) | 2755 | 22642 / 29565 |
| 3. Normalizator + literówki | 86.9% (+2.8 pp) | 1.1% | 3474 (27.1%) | 3152 | 22642 / 29092 |
| 4. Aliasy z przeglądu top-500 | 90.5% (+3.6 pp) | 1.2% | 6478 (50.5%) | 5820 | 22949 / 29460 |
