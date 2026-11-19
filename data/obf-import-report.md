# Import Open Beauty Facts

Wygenerowano: 2026-11-19 12:07 UTC · zrzut z 2026-11-19 · skrypt `pnpm catalog:import-obf`

Dane: Open Beauty Facts (https://world.openbeautyfacts.org), licencja ODbL 1.0.

## Liczby

| | Liczba |
| --- | ---: |
| Przeczytane rekordy | 80784 |
| Zachowane (EAN + skład + UE) | 12837 |
| — w tym rynek polski (en:poland) | 219 |
| Nowe w bazie | 1 |
| Zaktualizowane | 0 |
| Bez zmian (ten sam last_modified_t) | 12836 |
| Pominięte razem | 67947 |
| Produkty OBF w bazie po imporcie | 12837 (rynek PL: 219) |

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
| other | 12181 |
| sunscreen | 237 |
| moisturizer | 197 |
| cleanser | 121 |
| mask | 67 |
| exfoliant | 13 |
| serum | 13 |
| eye_cream | 4 |
| toner | 4 |

## Rozpoznawanie składników (wszystkie produkty OBF w bazie)

- Nazw na listach: 220098, rozpoznanych w naszym słowniku: 123541 (56.1%).
- Produkty z w pełni rozpoznanym składem: 265 z 12837.
- Nierozpoznane nazwy zapisujemy dosłownie w `products.inci_unknown` — bez zgadywania.
  Wynik dopasowania liczy je jako nieznane, więc ma niższą pewność.
