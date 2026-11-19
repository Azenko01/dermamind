# Zdjęcia produktów (własne)

Zdjęcia robi zespół — **nie pobieramy zdjęć ze sklepów** (prawa autorskie, regulaminy).

- Nazwa pliku = co jest na zdjęciu:
  - `5901234123457.jpg` — kod EAN-13 / EAN-8 produktu z katalogu,
  - `id-42.jpg` — id produktu (gdy nie ma kodu kreskowego).
- Format JPEG, PNG albo WebP, do 5 MB (najlepiej ok. 1000 px, < 500 kB), produkt na jasnym tle.
- Po dodaniu / usunięciu plików: `pnpm catalog:attach-images` — łączy pliki z produktami,
  usuwa powiązania plików, których już nie ma, i wypisuje, czego nie udało się dopasować.
- API serwuje je pod `/v1/product-images/<plik>`; własne zdjęcie ma pierwszeństwo przed
  zdjęciem z Open Beauty Facts. Podmieniając zdjęcie, nadaj plikowi nową nazwę
  (np. `id-42-v2.jpg`) — aplikacje trzymają zdjęcia w pamięci podręcznej przez tydzień.
