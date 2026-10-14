# Brakujące pełne składy INCI

Stan: 2026-10-14. Brakuje: **12 z 42**.

Strony nie zostały pobrane automatycznie: `robots.txt` sklepu hebe.pl blokuje agenta `ClaudeBot`
(i inne boty AI) na całej domenie, więc Claude ich nie pobiera. To samo dotyczy Open Beauty Facts.
Składów nie zgadujemy.

## Jak uzupełnić

1. Otwórz stronę produktu, zakładka **Skład**.
2. Skopiuj cały skład do `data/inci_full.json`, pole `inci` danego produktu: lista nazw w kolejności
   z opakowania (`["Aqua", "Glycerin"]`) albo jeden napis z przecinkami (`["Aqua, Glycerin"]`).
3. Uruchom ponownie `pnpm import:catalog` — ten plik i `data/import-report.md` się zaktualizują.

| # | Marka | Produkt (nazwa z bazy Sa.Shy) | Strona |
| --- | --- | --- | --- |
| 1 | Bielenda | Bielenda Hydro Lipidium SPF50 | [strona](https://www.hebe.pl/bielenda-krem-barierowy-nawilzajaco-ochronny-z-spf50-do-twarzy-30-ml-000000000000459601.html) |
| 2 | Bielenda | Bielenda Skin Clinic Soothing Cream | [strona](https://www.hebe.pl/bielenda-wzmacniajaco-kojacy-krem-do-twarzy-40-ml-000000000000649030.html) |
| 3 | Nacomi | Nacomi Oily Skin Toner | [strona](https://www.hebe.pl/nacomi-tonik-do-skory-tlustej-i-tradzikowej-100-ml-000000000000433325.html) |
| 4 | SKIN1004 | SKIN1004 Hyalu-Cica SPF50 | [strona](https://www.hebe.pl/skin1004-lekki-nawilzajacy-krem-przeciwsloneczny-spf50-pa-15-ml-000000000000559289.html) |
| 5 | Pharmaceris | Pharmaceris PURI-SEBOGEL | [strona](https://www.hebe.pl/pharmaceris-antybakteryjny-zel-myjacy-do-twarzy-przeciw-niedoskonalosciom-190-ml-000000000000250691.html) |
| 6 | Pharmaceris | Pharmaceris PURI-SEBOSTATIC | [strona](https://www.hebe.pl/pharmaceris-nawilzajaca-pianka-oczyszczajaca-do-skory-tradzikowej-150-ml-000000000000225431.html) |
| 7 | Pharmaceris | Pharmaceris PURI-SEBOTONIQUE | [strona](https://www.hebe.pl/pharmaceris-tonik-normalizujacy-do-twarzy-200-ml-000000000000225421.html) |
| 8 | Pharmaceris | Pharmaceris Physiopuric-Gel | [strona](https://www.hebe.pl/pharmaceris-zel-myjacy-z-kwasem-hialuronowym-do-twarzy-i-okolic-oczu-190-ml-000000000000257871.html) |
| 9 | Pharmaceris | Pharmaceris Corneo-Sensilium | [strona](https://www.hebe.pl/pharmaceris-dermo-naprawczy-krem-regenerujacy-do-twarzy-i-ciala-dla-doroslych-dzieci-i-niemowlat-75-ml-000000000000389543.html) |
| 10 | Pharmaceris | Pharmaceris Vita-Sensilium SPF30 | [strona](https://www.hebe.pl/pharmaceris-lekki-krem-gleboko-nawilzajacy-do-twarzy-spf30-50-ml-000000000000225413.html) |
| 11 | Pharmaceris | Pharmaceris R Lipo-Rosalgin | [strona](https://www.hebe.pl/pharmaceris-multikojacy-krem-spf30-do-twarzy-dla-skory-suchej-normalnej-i-wrazliwej-30-ml-000000000000225424.html) |
| 12 | Pharmaceris | Pharmaceris R Calm-Rosalgin | [strona](https://www.hebe.pl/pharmaceris-krem-do-twarzy-redukujacy-zaczerwienienia-na-noc-30-ml-000000000000264707.html) |
