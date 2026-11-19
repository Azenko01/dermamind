# Import Open Beauty Facts

Wygenerowano: 2026-11-19 13:29 UTC · zrzut z 2026-11-19 · skrypt `pnpm catalog:import-obf`

Dane: Open Beauty Facts (https://world.openbeautyfacts.org), licencja ODbL 1.0.

## Liczby

| | Liczba |
| --- | ---: |
| Przeczytane rekordy | 80784 |
| Zachowane (EAN + skład + UE) | 12837 |
| — w tym rynek polski (en:poland) | 219 |
| Nowe w bazie | 0 |
| Zaktualizowane | 12837 |
| Bez zmian (ten sam last_modified_t) | 0 |
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
