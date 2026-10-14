# Brakujące pełne składy INCI

Stan: 2026-10-14. Brakuje: **42 z 42**.

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
| 1 | Bielenda | Bielenda Hydro Lipidium Emulsion | [strona](https://www.hebe.pl/bielenda-delikatna-emulsja-do-mycia-twarzy-i-demakijazu-300-ml-000000000000459599.html) |
| 2 | Bielenda | Bielenda Hydro Lipidium Barrier Cream | [strona](https://www.hebe.pl/bielenda-wysokolipidowy-krem-barierowy-silnie-regenerujacy-do-twarzy-50-ml-000000000000459600.html) |
| 3 | Bielenda | Bielenda Hydro Lipidium SPF50 | [strona](https://www.hebe.pl/bielenda-krem-barierowy-nawilzajaco-ochronny-z-spf50-do-twarzy-30-ml-000000000000459601.html) |
| 4 | Bielenda | Bielenda Hydro Lipidium Serum | [strona](https://www.hebe.pl/bielenda-serum-barierowe-nawilzajaco-kojace-do-twarzy-30-ml-000000000000459602.html) |
| 5 | Bielenda | Bielenda Skin Clinic Hyaluronic Serum | [strona](https://www.hebe.pl/bielenda-serum-z-kwasem-hialuronowym-do-twarzy-30-ml-000000000000428152.html) |
| 6 | Bielenda | Bielenda Skin Clinic Niacinamide Serum | [strona](https://www.hebe.pl/bielenda-serum-z-niacynamidem-do-twarzy-30-ml-000000000000428151.html) |
| 7 | Bielenda | Bielenda Skin Clinic Vitamin C Serum | [strona](https://www.hebe.pl/bielenda-serum-z-witamina-c-do-twarzy-30-ml-000000000000428149.html) |
| 8 | Bielenda | Bielenda Skin Clinic Soothing Cream | [strona](https://www.hebe.pl/bielenda-wzmacniajaco-kojacy-krem-do-twarzy-40-ml-000000000000649030.html) |
| 9 | Nacomi | Nacomi Antibacterial Gel | [strona](https://www.hebe.pl/nacomi-oczyszczajacy-zel-antybakteryjny-do-mycia-twarzy-150-ml-000000000000424295.html) |
| 10 | Nacomi | Nacomi Cleansing Emulsion | [strona](https://www.hebe.pl/nacomi-emulsja-do-mycia-twarzy-150-ml-000000000000424294.html) |
| 11 | Nacomi | Nacomi Micellar Water Sensitive | [strona](https://www.hebe.pl/nacomi-plyn-micelarny-do-skory-suchej-i-wrazliwej-200-ml-000000000000433817.html) |
| 12 | Nacomi | Nacomi Acne Cream | [strona](https://www.hebe.pl/nacomi-krem-do-twarzy-na-tradzik-50-ml-000000000000424296.html) |
| 13 | Nacomi | Nacomi Moisturizing Cream | [strona](https://www.hebe.pl/nacomi-nawilzajacy-krem-do-twarzy-50-ml-000000000000424298.html) |
| 14 | Nacomi | Nacomi Dry Skin Toner | [strona](https://www.hebe.pl/nacomi-tonik-do-skory-suchej-i-wrazliwej-100-ml-000000000000433322.html) |
| 15 | Nacomi | Nacomi Oily Skin Toner | [strona](https://www.hebe.pl/nacomi-tonik-do-skory-tlustej-i-tradzikowej-100-ml-000000000000433325.html) |
| 16 | Nacomi | Nacomi Salicylic Acid Serum | [strona](https://www.hebe.pl/nacomi-kwas-salicylowy-2-pha-30-ml-000000000000505251.html) |
| 17 | Nacomi | Nacomi Peptides Serum | [strona](https://www.hebe.pl/nacomi-peptydy-10-30-ml-000000000000381696.html) |
| 18 | Nacomi | Nacomi Azeloglycine Serum | [strona](https://www.hebe.pl/nacomi-azeloglicyna-5-30-ml-000000000000405433.html) |
| 19 | SKIN1004 | SKIN1004 Centella Cleansing Oil | [strona](https://www.hebe.pl/skin1004-lekki-olejek-myjacy-do-twarzy-z-wakrota-azjatycka-30-ml-000000000000559273.html) |
| 20 | SKIN1004 | SKIN1004 Centella Foam | [strona](https://www.hebe.pl/skin1004-oczyszczajaca-pianka-do-twarzy-z-wakrota-azjatycka-20-ml-000000000000559274.html) |
| 21 | SKIN1004 | SKIN1004 Centella Serum | [strona](https://www.hebe.pl/skin1004-odzywcze-serum-do-twarzy-z-wakrota-azjatycka-30-ml-000000000000559279.html) |
| 22 | SKIN1004 | SKIN1004 Poremizing Serum | [strona](https://www.hebe.pl/skin1004-serum-dla-cery-tlustej-i-mieszanej-30-ml-000000000000559316.html) |
| 23 | SKIN1004 | SKIN1004 Probio-Cica Serum | [strona](https://www.hebe.pl/skin1004-wzmacniajace-serum-do-twarzy-dla-skory-suchej-wrazliwej-i-podraznionej-50-ml-000000000000559148.html) |
| 24 | SKIN1004 | SKIN1004 Hyalu-Cica SPF50 | [strona](https://www.hebe.pl/skin1004-lekki-nawilzajacy-krem-przeciwsloneczny-spf50-pa-15-ml-000000000000559289.html) |
| 25 | SKIN1004 | SKIN1004 Centella Cream | [strona](https://www.hebe.pl/skin1004-regenerujacy-krem-do-twarzy-z-wakrota-azjatycka-30-ml-000000000000559280.html) |
| 26 | SKIN1004 | SKIN1004 Probio-Cica Cream | [strona](https://www.hebe.pl/skin1004-intensywnie-regenerujacy-krem-z-probiotykami-15-ml-000000000000559147.html) |
| 27 | SKIN1004 | SKIN1004 Poremizing Cream | [strona](https://www.hebe.pl/skin1004-lekki-krem-dla-cery-tlustej-i-mieszanej-75-ml-000000000000559307.html) |
| 28 | SKIN1004 | SKIN1004 PHA Toner | [strona](https://www.hebe.pl/skin1004-delikatnie-zluszczajacy-toner-z-kwasami-pha-30-ml-000000000000559277.html) |
| 29 | SKIN1004 | SKIN1004 Hyalu-Cica Toner | [strona](https://www.hebe.pl/skin1004-rozjasniajacy-tonik-do-twarzy-z-wakrota-azjatycka-i-kwasem-hialuronowym-30-ml-000000000000559284.html) |
| 30 | SKIN1004 | SKIN1004 Probio-Cica Toner | [strona](https://www.hebe.pl/skin1004-odzywczy-toner-z-probiotykami-210-ml-000000000000559154.html) |
| 31 | SKIN1004 | SKIN1004 Poremizing Toner | [strona](https://www.hebe.pl/skin1004-toner-minimalizujacy-widocznosc-porow-210-ml-000000000000559295.html) |
| 32 | Pharmaceris | Pharmaceris PURI-SEBOGEL | [strona](https://www.hebe.pl/pharmaceris-antybakteryjny-zel-myjacy-do-twarzy-przeciw-niedoskonalosciom-190-ml-000000000000250691.html) |
| 33 | Pharmaceris | Pharmaceris PURI-SEBOSTATIC | [strona](https://www.hebe.pl/pharmaceris-nawilzajaca-pianka-oczyszczajaca-do-skory-tradzikowej-150-ml-000000000000225431.html) |
| 34 | Pharmaceris | Pharmaceris PURI-SEBOTONIQUE | [strona](https://www.hebe.pl/pharmaceris-tonik-normalizujacy-do-twarzy-200-ml-000000000000225421.html) |
| 35 | Pharmaceris | Pharmaceris T Comedo Acne | [strona](https://www.hebe.pl/pharmaceris-krem-redukujacy-niedoskonalosci-i-zaskorniki-tradzik-mlodzienczy-40-ml-000000000000389535.html) |
| 36 | Pharmaceris | Pharmaceris Physiopuric-Gel | [strona](https://www.hebe.pl/pharmaceris-zel-myjacy-z-kwasem-hialuronowym-do-twarzy-i-okolic-oczu-190-ml-000000000000257871.html) |
| 37 | Pharmaceris | Pharmaceris Puri-Sensilium | [strona](https://www.hebe.pl/pharmaceris-lagodzaca-pianka-myjaca-do-twarzy-i-okolic-oczu-150-ml-000000000000225425.html) |
| 38 | Pharmaceris | Pharmaceris Corneo-Sensilium | [strona](https://www.hebe.pl/pharmaceris-dermo-naprawczy-krem-regenerujacy-do-twarzy-i-ciala-dla-doroslych-dzieci-i-niemowlat-75-ml-000000000000389543.html) |
| 39 | Pharmaceris | Pharmaceris Vita-Sensilium SPF30 | [strona](https://www.hebe.pl/pharmaceris-lekki-krem-gleboko-nawilzajacy-do-twarzy-spf30-50-ml-000000000000225413.html) |
| 40 | Pharmaceris | Pharmaceris R Puri-Rosalgin | [strona](https://www.hebe.pl/pharmaceris-kojacy-fizjologiczny-zel-do-mycia-twarzy-i-okolic-oczu-190-ml-000000000000257825.html) |
| 41 | Pharmaceris | Pharmaceris R Lipo-Rosalgin | [strona](https://www.hebe.pl/pharmaceris-multikojacy-krem-spf30-do-twarzy-dla-skory-suchej-normalnej-i-wrazliwej-30-ml-000000000000225424.html) |
| 42 | Pharmaceris | Pharmaceris R Calm-Rosalgin | [strona](https://www.hebe.pl/pharmaceris-krem-do-twarzy-redukujacy-zaczerwienienia-na-noc-30-ml-000000000000264707.html) |
