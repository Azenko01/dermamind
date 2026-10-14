-- =========================================
-- SKINCARE RECOMMENDATION DATABASE
-- FINAL VERSION WITH INCI LOGIC
-- PostgreSQL
-- =========================================


-- =========================================
-- DROP TABLES
-- =========================================

DROP TABLE IF EXISTS ingredient_effects CASCADE;
DROP TABLE IF EXISTS product_ingredients CASCADE;
DROP TABLE IF EXISTS skin_problems CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS products CASCADE;


-- =========================================
-- PRODUCTS
-- =========================================

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    price DECIMAL(10,2),
    currency TEXT DEFAULT 'PLN',
    product_url TEXT
);


-- =========================================
-- INGREDIENTS
-- =========================================

CREATE TABLE ingredients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);


-- =========================================
-- PRODUCT ↔ INGREDIENT RELATIONS
-- ingredient_order = position in INCI
-- =========================================

CREATE TABLE product_ingredients (
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
    ingredient_order INT NOT NULL,
    PRIMARY KEY (product_id, ingredient_id)
);


-- =========================================
-- SKIN PROBLEMS
-- =========================================

CREATE TABLE skin_problems (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);


-- =========================================
-- INGREDIENT EFFECTS
-- =========================================

CREATE TABLE ingredient_effects (
    ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
    skin_problem_id INT REFERENCES skin_problems(id) ON DELETE CASCADE,
    effect_type TEXT CHECK (effect_type IN ('good', 'bad')),
    PRIMARY KEY (ingredient_id, skin_problem_id)
);


-- =========================================
-- SKIN PROBLEMS DATA
-- =========================================

INSERT INTO skin_problems (name) VALUES
('acne'),
('oily_skin'),
('dry_skin'),
('sensitive_skin'),
('dehydrated_skin'),
('redness'),
('barrier_damage');

-- =========================================
-- PRODUCTS
-- =========================================

INSERT INTO products
(name, brand, category, price, product_url)
VALUES

(
'Bielenda Hydro Lipidium Emulsion',
'Bielenda',
'cleanser',
28.99,
'https://www.hebe.pl/bielenda-delikatna-emulsja-do-mycia-twarzy-i-demakijazu-300-ml-000000000000459599.html'
),

(
'Bielenda Hydro Lipidium Barrier Cream',
'Bielenda',
'cream',
27.99,
'https://www.hebe.pl/bielenda-wysokolipidowy-krem-barierowy-silnie-regenerujacy-do-twarzy-50-ml-000000000000459600.html'
),

(
'Bielenda Hydro Lipidium SPF50',
'Bielenda',
'spf',
27.99,
'https://www.hebe.pl/bielenda-krem-barierowy-nawilzajaco-ochronny-z-spf50-do-twarzy-30-ml-000000000000459601.html'
),

(
'Bielenda Hydro Lipidium Serum',
'Bielenda',
'serum',
27.99,
'https://www.hebe.pl/bielenda-serum-barierowe-nawilzajaco-kojace-do-twarzy-30-ml-000000000000459602.html'
),

(
'Bielenda Skin Clinic Hyaluronic Serum',
'Bielenda',
'serum',
31.99,
'https://www.hebe.pl/bielenda-serum-z-kwasem-hialuronowym-do-twarzy-30-ml-000000000000428152.html'
),

(
'Bielenda Skin Clinic Niacinamide Serum',
'Bielenda',
'serum',
31.99,
'https://www.hebe.pl/bielenda-serum-z-niacynamidem-do-twarzy-30-ml-000000000000428151.html'
),

(
'Bielenda Skin Clinic Vitamin C Serum',
'Bielenda',
'serum',
31.99,
'https://www.hebe.pl/bielenda-serum-z-witamina-c-do-twarzy-30-ml-000000000000428149.html'
),

(
'Bielenda Skin Clinic Soothing Cream',
'Bielenda',
'cream',
34.99,
'https://www.hebe.pl/bielenda-wzmacniajaco-kojacy-krem-do-twarzy-40-ml-000000000000649030.html'
),

(
'Nacomi Antibacterial Gel',
'Nacomi',
'cleanser',
28.99,
'https://www.hebe.pl/nacomi-oczyszczajacy-zel-antybakteryjny-do-mycia-twarzy-150-ml-000000000000424295.html'
),

(
'Nacomi Cleansing Emulsion',
'Nacomi',
'cleanser',
28.49,
'https://www.hebe.pl/nacomi-emulsja-do-mycia-twarzy-150-ml-000000000000424294.html'
),

(
'Nacomi Micellar Water Sensitive',
'Nacomi',
'micellar_water',
19.99,
'https://www.hebe.pl/nacomi-plyn-micelarny-do-skory-suchej-i-wrazliwej-200-ml-000000000000433817.html'
),

(
'Nacomi Acne Cream',
'Nacomi',
'cream',
41.99,
'https://www.hebe.pl/nacomi-krem-do-twarzy-na-tradzik-50-ml-000000000000424296.html'
),

(
'Nacomi Moisturizing Cream',
'Nacomi',
'cream',
42.99,
'https://www.hebe.pl/nacomi-nawilzajacy-krem-do-twarzy-50-ml-000000000000424298.html'
),

(
'Nacomi Dry Skin Toner',
'Nacomi',
'toner',
24.49,
'https://www.hebe.pl/nacomi-tonik-do-skory-suchej-i-wrazliwej-100-ml-000000000000433322.html'
),

(
'Nacomi Oily Skin Toner',
'Nacomi',
'toner',
24.49,
'https://www.hebe.pl/nacomi-tonik-do-skory-tlustej-i-tradzikowej-100-ml-000000000000433325.html'
),

(
'Nacomi Salicylic Acid Serum',
'Nacomi',
'serum',
27.99,
'https://www.hebe.pl/nacomi-kwas-salicylowy-2-pha-30-ml-000000000000505251.html'
),

(
'Nacomi Peptides Serum',
'Nacomi',
'serum',
47.99,
'https://www.hebe.pl/nacomi-peptydy-10-30-ml-000000000000381696.html'
),

(
'Nacomi Azeloglycine Serum',
'Nacomi',
'serum',
35.99,
'https://www.hebe.pl/nacomi-azeloglicyna-5-30-ml-000000000000405433.html'
),

(
'SKIN1004 Centella Cleansing Oil',
'SKIN1004',
'oil',
119.99,
'https://www.hebe.pl/skin1004-lekki-olejek-myjacy-do-twarzy-z-wakrota-azjatycka-30-ml-000000000000559273.html'
),

(
'SKIN1004 Centella Foam',
'SKIN1004',
'cleanser',
99.99,
'https://www.hebe.pl/skin1004-oczyszczajaca-pianka-do-twarzy-z-wakrota-azjatycka-20-ml-000000000000559274.html'
),

(
'SKIN1004 Centella Serum',
'SKIN1004',
'serum',
129.99,
'https://www.hebe.pl/skin1004-odzywcze-serum-do-twarzy-z-wakrota-azjatycka-30-ml-000000000000559279.html'
),

(
'SKIN1004 Poremizing Serum',
'SKIN1004',
'serum',
119.99,
'https://www.hebe.pl/skin1004-serum-dla-cery-tlustej-i-mieszanej-30-ml-000000000000559316.html'
),

(
'SKIN1004 Probio-Cica Serum',
'SKIN1004',
'serum',
169.99,
'https://www.hebe.pl/skin1004-wzmacniajace-serum-do-twarzy-dla-skory-suchej-wrazliwej-i-podraznionej-50-ml-000000000000559148.html'
),

(
'SKIN1004 Hyalu-Cica SPF50',
'SKIN1004',
'spf',
129.99,
'https://www.hebe.pl/skin1004-lekki-nawilzajacy-krem-przeciwsloneczny-spf50-pa-15-ml-000000000000559289.html'
),

(
'SKIN1004 Centella Cream',
'SKIN1004',
'cream',
109.99,
'https://www.hebe.pl/skin1004-regenerujacy-krem-do-twarzy-z-wakrota-azjatycka-30-ml-000000000000559280.html'
),

(
'SKIN1004 Probio-Cica Cream',
'SKIN1004',
'cream',
139.99,
'https://www.hebe.pl/skin1004-intensywnie-regenerujacy-krem-z-probiotykami-15-ml-000000000000559147.html'
),

(
'SKIN1004 Poremizing Cream',
'SKIN1004',
'cream',
99.99,
'https://www.hebe.pl/skin1004-lekki-krem-dla-cery-tlustej-i-mieszanej-75-ml-000000000000559307.html'
),

(
'SKIN1004 PHA Toner',
'SKIN1004',
'toner',
109.99,
'https://www.hebe.pl/skin1004-delikatnie-zluszczajacy-toner-z-kwasami-pha-30-ml-000000000000559277.html'
),

(
'SKIN1004 Hyalu-Cica Toner',
'SKIN1004',
'toner',
109.99,
'https://www.hebe.pl/skin1004-rozjasniajacy-tonik-do-twarzy-z-wakrota-azjatycka-i-kwasem-hialuronowym-30-ml-000000000000559284.html'
),

(
'SKIN1004 Probio-Cica Toner',
'SKIN1004',
'toner',
119.99,
'https://www.hebe.pl/skin1004-odzywczy-toner-z-probiotykami-210-ml-000000000000559154.html'
),

(
'SKIN1004 Poremizing Toner',
'SKIN1004',
'toner',
109.99,
'https://www.hebe.pl/skin1004-toner-minimalizujacy-widocznosc-porow-210-ml-000000000000559295.html'
),

(
'Pharmaceris PURI-SEBOGEL',
'Pharmaceris',
'cleanser',
41.99,
'https://www.hebe.pl/pharmaceris-antybakteryjny-zel-myjacy-do-twarzy-przeciw-niedoskonalosciom-190-ml-000000000000250691.html'
),

(
'Pharmaceris PURI-SEBOSTATIC',
'Pharmaceris',
'cleanser',
45.99,
'https://www.hebe.pl/pharmaceris-nawilzajaca-pianka-oczyszczajaca-do-skory-tradzikowej-150-ml-000000000000225431.html'
),

(
'Pharmaceris PURI-SEBOTONIQUE',
'Pharmaceris',
'toner',
41.99,
'https://www.hebe.pl/pharmaceris-tonik-normalizujacy-do-twarzy-200-ml-000000000000225421.html'
),

(
'Pharmaceris T Comedo Acne',
'Pharmaceris',
'cream',
59.99,
'https://www.hebe.pl/pharmaceris-krem-redukujacy-niedoskonalosci-i-zaskorniki-tradzik-mlodzienczy-40-ml-000000000000389535.html'
),

(
'Pharmaceris Physiopuric-Gel',
'Pharmaceris',
'cleanser',
41.99,
'https://www.hebe.pl/pharmaceris-zel-myjacy-z-kwasem-hialuronowym-do-twarzy-i-okolic-oczu-190-ml-000000000000257871.html'
),

(
'Pharmaceris Puri-Sensilium',
'Pharmaceris',
'cleanser',
47.99,
'https://www.hebe.pl/pharmaceris-lagodzaca-pianka-myjaca-do-twarzy-i-okolic-oczu-150-ml-000000000000225425.html'
),

(
'Pharmaceris Corneo-Sensilium',
'Pharmaceris',
'cream',
68.99,
'https://www.hebe.pl/pharmaceris-dermo-naprawczy-krem-regenerujacy-do-twarzy-i-ciala-dla-doroslych-dzieci-i-niemowlat-75-ml-000000000000389543.html'
),

(
'Pharmaceris Vita-Sensilium SPF30',
'Pharmaceris',
'spf',
65.99,
'https://www.hebe.pl/pharmaceris-lekki-krem-gleboko-nawilzajacy-do-twarzy-spf30-50-ml-000000000000225413.html'
),

(
'Pharmaceris R Puri-Rosalgin',
'Pharmaceris',
'cleanser',
47.99,
'https://www.hebe.pl/pharmaceris-kojacy-fizjologiczny-zel-do-mycia-twarzy-i-okolic-oczu-190-ml-000000000000257825.html'
),

(
'Pharmaceris R Lipo-Rosalgin',
'Pharmaceris',
'cream',
65.99,
'https://www.hebe.pl/pharmaceris-multikojacy-krem-spf30-do-twarzy-dla-skory-suchej-normalnej-i-wrazliwej-30-ml-000000000000225424.html'
),

(
'Pharmaceris R Calm-Rosalgin',
'Pharmaceris',
'cream',
65.99,
'https://www.hebe.pl/pharmaceris-krem-do-twarzy-redukujacy-zaczerwienienia-na-noc-30-ml-000000000000264707.html'
);


-- =========================================
-- INGREDIENTS
-- =========================================

INSERT INTO ingredients (name) VALUES
('Aqua'),
('Glycerin'),
('Niacinamide'),
('Salicylic Acid'),
('Sodium Hyaluronate'),
('Panthenol'),
('Citric Acid'),
('Zinc PCA'),
('Allantoin'),
('Centella Asiatica Extract'),
('Ceramide NP'),
('Squalane'),
('Shea Butter'),
('Glycolic Acid'),
('Aloe Vera'),
('Betaine'),
('Tocopherol'),
('Parfum'),
('Hyaluronic Acid'),
('Lactic Acid'),
('Trehalose'),
('Ceramide AP'),
('Ceramide EOP'),
('Phytosphingosine'),
('Cholesterol'),
('Caprylic/Capric Triglyceride'),
('Propanediol');


-- =========================================
-- PRODUCT ↔ INGREDIENT RELATIONS
-- WITH INCI ORDER
-- =========================================


-- =========================================
-- Bielenda Hydro Lipidium Emulsion
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Squalane', 9),
    ('Panthenol', 10),
    ('Sodium Hyaluronate', 11),
    ('Ceramide NP', 15)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Hydro Lipidium Emulsion'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Hydro Lipidium Barrier Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 10),
    ('Panthenol', 14),
    ('Centella Asiatica Extract', 17),
    ('Ceramide NP', 25),
    ('Squalane', 5),
    ('Tocopherol', 40)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Hydro Lipidium Barrier Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Hydro Lipidium SPF50
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 6),
    ('Squalane', 14),
    ('Allantoin', 15),
    ('Panthenol', 16),
    ('Sodium Hyaluronate', 17),
    ('Ceramide NP', 22),
    ('Tocopherol', 38),
    ('Citric Acid', 39)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Hydro Lipidium SPF50'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Hydro Lipidium Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Squalane', 5),
    ('Panthenol', 10),
    ('Allantoin', 11),
    ('Sodium Hyaluronate', 15),
    ('Ceramide NP', 20),
    ('Tocopherol', 38),
    ('Citric Acid', 39)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Hydro Lipidium Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Skin Clinic Hyaluronic Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Panthenol', 2),
    ('Sodium Hyaluronate', 7),
    ('Parfum', 14)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Skin Clinic Hyaluronic Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Skin Clinic Niacinamide Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Niacinamide', 2),
    ('Panthenol', 4),
    ('Glycerin', 5)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Skin Clinic Niacinamide Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Skin Clinic Vitamin C Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Citric Acid', 4),
    ('Glycerin', 5)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Skin Clinic Vitamin C Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- Bielenda Skin Clinic Soothing Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 6),
    ('Niacinamide', 8),
    ('Panthenol', 15),
    ('Allantoin', 21),
    ('Squalane', 32),
    ('Tocopherol', 38),
    ('Parfum', 41),
    ('Citric Acid', 36)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Bielenda Skin Clinic Soothing Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Antibacterial Gel
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 4),
    ('Niacinamide', 5),
    ('Panthenol', 11),
    ('Tocopherol', 14),
    ('Citric Acid', 20),
    ('Parfum', 31)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Antibacterial Gel'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Cleansing Emulsion
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 3),
    ('Betaine', 12),
    ('Ceramide NP', 17),
    ('Tocopherol', 20),
    ('Citric Acid', 31),
    ('Parfum', 44)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Cleansing Emulsion'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Micellar Water Sensitive
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 3),
    ('Niacinamide', 5),
    ('Allantoin', 6)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Micellar Water Sensitive'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Acne Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Niacinamide', 2),
    ('Glycerin', 4),
    ('Allantoin', 11),
    ('Tocopherol', 15),
    ('Parfum', 17)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Acne Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Moisturizing Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Niacinamide', 9),
    ('Allantoin', 21),
    ('Glycerin', 31),
    ('Sodium Hyaluronate', 29),
    ('Shea Butter', 8),
    ('Parfum', 42)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Moisturizing Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Dry Skin Toner
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Sodium Hyaluronate', 4),
    ('Allantoin', 5)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Dry Skin Toner'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Oily Skin Toner
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Niacinamide', 3),
    ('Panthenol', 4),
    ('Allantoin', 7),
    ('Sodium Hyaluronate', 8),
    ('Citric Acid', 15)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Oily Skin Toner'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Salicylic Acid Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Niacinamide', 3),
    ('Glycerin', 4),
    ('Salicylic Acid', 5)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Salicylic Acid Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Peptides Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Citric Acid', 16),
    ('Sodium Hyaluronate', 6)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Peptides Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- Nacomi Azeloglycine Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Panthenol', 4),
    ('Shea Butter', 5),
    ('Sodium Hyaluronate', 19),
    ('Citric Acid', 29)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Nacomi Azeloglycine Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Centella Cleansing Oil
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 4)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Centella Cleansing Oil'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Centella Foam
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 3),
    ('Citric Acid', 13),
    ('Sodium Hyaluronate', 20)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Centella Foam'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Centella Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Glycerin', 2),
    ('Centella Asiatica Extract', 4)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Centella Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Poremizing Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 9),
    ('Panthenol', 11),
    ('Aloe Vera', 6),
    ('Sodium Hyaluronate', 21)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Poremizing Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Probio-Cica Serum
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 3),
    ('Niacinamide', 7),
    ('Betaine', 16),
    ('Allantoin', 17),
    ('Panthenol', 18),
    ('Sodium Hyaluronate', 32),
    ('Ceramide NP', 33)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Probio-Cica Serum'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Hyalu-Cica SPF50
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Niacinamide', 8),
    ('Glycerin', 14),
    ('Centella Asiatica Extract', 17),
    ('Sodium Hyaluronate', 25),
    ('Tocopherol', 40)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Hyalu-Cica SPF50'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Centella Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 2),
    ('Sodium Hyaluronate', 27),
    ('Ceramide NP', 30)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Centella Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Probio-Cica Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 2),
    ('Niacinamide', 6),
    ('Shea Butter', 18),
    ('Squalane', 24),
    ('Sodium Hyaluronate', 35),
    ('Ceramide NP', 38)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Probio-Cica Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Poremizing Cream
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Aloe Vera', 4),
    ('Niacinamide', 6),
    ('Glycerin', 7),
    ('Betaine', 13),
    ('Panthenol', 31),
    ('Sodium Hyaluronate', 34),
    ('Allantoin', 45)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Poremizing Cream'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 PHA Toner
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Niacinamide', 5),
    ('Betaine', 12),
    ('Hyaluronic Acid', 13)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 PHA Toner'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Hyalu-Cica Toner
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Niacinamide', 4),
    ('Betaine', 6),
    ('Sodium Hyaluronate', 7),
    ('Hyaluronic Acid', 9),
    ('Citric Acid', 28)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Hyalu-Cica Toner'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Probio-Cica Toner
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 4),
    ('Panthenol', 11),
    ('Ceramide NP', 22),
    ('Sodium Hyaluronate', 28),
    ('Betaine', 31),
    ('Citric Acid', 18)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Probio-Cica Toner'

ON CONFLICT DO NOTHING;


-- =========================================
-- SKIN1004 Poremizing Toner
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Centella Asiatica Extract', 1),
    ('Glycerin', 5),
    ('Betaine', 7),
    ('Panthenol', 9),
    ('Sodium Hyaluronate', 18),
    ('Allantoin', 19),
    ('Citric Acid', 20),
    ('Salicylic Acid', 23),
    ('Glycolic Acid', 24)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'SKIN1004 Poremizing Toner'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris PURI-SEBOGEL
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 3),
    ('Salicylic Acid', 10),
    ('Citric Acid', 13),
    ('Parfum', 16)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris PURI-SEBOGEL'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris PURI-SEBOSTATIC
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Zinc PCA', 7),
    ('Betaine', 12),
    ('Citric Acid', 11),
    ('Parfum', 15)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris PURI-SEBOSTATIC'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris PURI-SEBOTONIQUE
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Zinc PCA', 6),
    ('Citric Acid', 10),
    ('Parfum', 13)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris PURI-SEBOTONIQUE'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris T Comedo Acne
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 4),
    ('Niacinamide', 12),
    ('Parfum', 20)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris T Comedo Acne'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris Physiopuric-Gel
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Betaine', 4),
    ('Panthenol', 5),
    ('Allantoin', 6),
    ('Sodium Hyaluronate', 12),
    ('Tocopherol', 14),
    ('Citric Acid', 25)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris Physiopuric-Gel'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris Puri-Sensilium
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 2),
    ('Betaine', 8),
    ('Panthenol', 9),
    ('Citric Acid', 18)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris Puri-Sensilium'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris Corneo-Sensilium
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Shea Butter', 2),
    ('Glycerin', 8),
    ('Allantoin', 17),
    ('Ceramide NP', 21),
    ('Tocopherol', 23)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris Corneo-Sensilium'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris Vita-Sensilium SPF30
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 3),
    ('Allantoin', 16),
    ('Panthenol', 17),
    ('Tocopherol', 22),
    ('Citric Acid', 36)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris Vita-Sensilium SPF30'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris R Puri-Rosalgin
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Betaine', 3),
    ('Panthenol', 5),
    ('Glycerin', 8),
    ('Citric Acid', 9)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris R Puri-Rosalgin'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris R Lipo-Rosalgin
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 10),
    ('Panthenol', 15),
    ('Allantoin', 17)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris R Lipo-Rosalgin'

ON CONFLICT DO NOTHING;


-- =========================================
-- Pharmaceris R Calm-Rosalgin
-- =========================================

INSERT INTO product_ingredients
(product_id, ingredient_id, ingredient_order)

SELECT
    p.id,
    i.id,
    x.ingredient_order

FROM (
    VALUES
    ('Aqua', 1),
    ('Glycerin', 4),
    ('Panthenol', 13),
    ('Squalane', 15),
    ('Allantoin', 17),
    ('Tocopherol', 27),
    ('Citric Acid', 35)
) AS x(name, ingredient_order)

JOIN ingredients i
ON i.name = x.name

JOIN products p
ON p.name = 'Pharmaceris R Calm-Rosalgin'

ON CONFLICT DO NOTHING;


-- =========================================
-- INGREDIENT EFFECTS
-- =========================================


INSERT INTO ingredient_effects
(ingredient_id, skin_problem_id, effect_type)

SELECT
    i.id,
    sp.id,
    x.effect_type

FROM (
    VALUES

    -- Glycerin
    ('Glycerin', 'dry_skin', 'good'),
    ('Glycerin', 'dehydrated_skin', 'good'),

    -- Niacinamide
    ('Niacinamide', 'acne', 'good'),
    ('Niacinamide', 'oily_skin', 'good'),

    -- Salicylic Acid
    ('Salicylic Acid', 'acne', 'good'),
    ('Salicylic Acid', 'dry_skin', 'bad'),
    ('Salicylic Acid', 'sensitive_skin', 'bad'),

    -- Sodium Hyaluronate
    ('Sodium Hyaluronate', 'dehydrated_skin', 'good'),

    -- Panthenol
    ('Panthenol', 'sensitive_skin', 'good'),
    ('Panthenol', 'redness', 'good'),

    -- Zinc PCA
    ('Zinc PCA', 'acne', 'good'),
    ('Zinc PCA', 'oily_skin', 'good'),

    -- Allantoin
    ('Allantoin', 'redness', 'good'),

    -- Centella Asiatica Extract
    ('Centella Asiatica Extract', 'sensitive_skin', 'good'),
    ('Centella Asiatica Extract', 'redness', 'good'),

    -- Ceramide NP
    ('Ceramide NP', 'barrier_damage', 'good'),

    -- Squalane
    ('Squalane', 'dry_skin', 'good'),

    -- Shea Butter
    ('Shea Butter', 'acne', 'bad'),

    -- Glycolic Acid
    ('Glycolic Acid', 'sensitive_skin', 'bad'),

    -- Aloe Vera
    ('Aloe Vera', 'sensitive_skin', 'good'),
    ('Aloe Vera', 'redness', 'good'),
    ('Aloe Vera', 'dehydrated_skin', 'good'),

    -- Betaine
    ('Betaine', 'dehydrated_skin', 'good'),
    ('Betaine', 'sensitive_skin', 'good'),

    -- Tocopherol
    ('Tocopherol', 'dry_skin', 'good'),
    ('Tocopherol', 'barrier_damage', 'good'),

    -- Parfum
    ('Parfum', 'sensitive_skin', 'bad'),

    -- Hyaluronic Acid
    ('Hyaluronic Acid', 'dehydrated_skin', 'good'),

    -- Lactic Acid
    ('Lactic Acid', 'dehydrated_skin', 'good'),
    ('Lactic Acid', 'sensitive_skin', 'bad'),

    -- Trehalose
    ('Trehalose', 'dehydrated_skin', 'good'),

    -- Ceramide AP
    ('Ceramide AP', 'barrier_damage', 'good'),

    -- Ceramide EOP
    ('Ceramide EOP', 'barrier_damage', 'good'),

    -- Phytosphingosine
    ('Phytosphingosine', 'barrier_damage', 'good'),

    -- Cholesterol
    ('Cholesterol', 'barrier_damage', 'good')

) AS x(ingredient_name, skin_problem_name, effect_type)

JOIN ingredients i
ON i.name = x.ingredient_name

JOIN skin_problems sp
ON sp.name = x.skin_problem_name

ON CONFLICT DO NOTHING;


-- =========================================
-- ADVANCED FILTERING SYSTEM
-- ACNE + SERUMS + PRICE LIMIT
-- =========================================

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    COUNT(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1
        END
    ) AS positive_score,

    COUNT(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.name = 'acne'

AND p.category = 'serum'

AND p.price <= 50

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

HAVING COUNT(
    CASE
        WHEN ie.effect_type = 'bad'
        THEN 1
    END
) = 0

ORDER BY
    positive_score DESC,
    negative_score ASC,
    p.price ASC;

-- =========================================
-- MULTI-CONDITION FILTERING
-- ACNE + OILY SKIN
-- =========================================

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    COUNT(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1
        END
    ) AS positive_score,

    COUNT(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.name IN ('acne', 'oily_skin')

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

ORDER BY
    positive_score DESC,
    negative_score ASC,
    p.price ASC;


-- =========================================
-- STRICT MULTI-CONDITION FILTERING
-- PRODUCT MUST MATCH BOTH CONDITIONS
-- =========================================

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    COUNT(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1
        END
    ) AS positive_score,

    COUNT(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1
        END
    ) AS negative_score,

    COUNT(DISTINCT sp.name) AS matched_conditions

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE
    sp.name IN ('acne', 'oily_skin')
    AND ie.effect_type = 'good'

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

HAVING COUNT(DISTINCT sp.name) = 2

ORDER BY
    positive_score DESC,
    negative_score ASC,
    p.price ASC;


-- =========================================
-- ACNE PRODUCTS
-- WITHOUT PROBLEMATIC INGREDIENTS
-- =========================================

SELECT
    p.name,
    p.brand,
    p.category,
    p.price

FROM products p

WHERE NOT EXISTS (

    SELECT 1

    FROM product_ingredients pi

    JOIN ingredients i
    ON pi.ingredient_id = i.id

    WHERE p.id = pi.product_id

    AND i.name IN (
        'Parfum',
        'Glycolic Acid',
        'Shea Butter'
    )
)

ORDER BY p.price ASC;


-- =========================================
-- FULL ADVANCED FILTERING SYSTEM
-- =========================================

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    COUNT(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1
        END
    ) AS positive_score,

    COUNT(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1
        END
    ) AS negative_score,

    COUNT(DISTINCT sp.name) AS matched_conditions

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE
    sp.name IN ('acne', 'oily_skin')
    AND ie.effect_type = 'good'
    AND p.category IN ('serum', 'cream')
    AND p.price <= 60

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

HAVING
    COUNT(DISTINCT sp.name) = 2

    AND NOT EXISTS (

        SELECT 1

        FROM product_ingredients pi2

        JOIN ingredients i2
        ON pi2.ingredient_id = i2.id

        WHERE pi2.product_id = p.id

        AND i2.name IN (
            'Parfum',
            'Glycolic Acid'
        )
    )

ORDER BY
    positive_score DESC,
    negative_score ASC,
    p.price ASC;


-- =========================================
-- VIEW: ACNE RECOMMENDATIONS
-- =========================================

CREATE OR REPLACE VIEW acne_recommendations AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    COUNT(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1
        END
    ) AS positive_score,

    COUNT(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.name = 'acne'

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price;


SELECT *
FROM acne_recommendations
ORDER BY positive_score DESC;


-- =========================================
-- VIEW: SENSITIVE SKIN SAFE PRODUCTS
-- =========================================

CREATE OR REPLACE VIEW sensitive_skin_safe_products AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price

FROM products p

WHERE NOT EXISTS (

    SELECT 1

    FROM product_ingredients pi

    JOIN ingredients i
    ON pi.ingredient_id = i.id

    WHERE p.id = pi.product_id

    AND i.name IN (
        'Parfum',
        'Glycolic Acid'
    )
);


SELECT *
FROM sensitive_skin_safe_products
ORDER BY price ASC;


-- =========================================
-- VIEW: WEIGHTED ACNE RECOMMENDATIONS
-- =========================================

CREATE OR REPLACE VIEW weighted_acne_recommendations AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1

            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.name = 'acne'

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price;


SELECT *
FROM weighted_acne_recommendations
ORDER BY positive_score DESC,
negative_score ASC;


-- =========================================
-- VIEW: BARRIER REPAIR PRODUCTS
-- =========================================

CREATE OR REPLACE VIEW barrier_repair_products AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE
    sp.name = 'barrier_damage'
    AND ie.effect_type = 'good'

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price;


SELECT *
FROM barrier_repair_products
ORDER BY price ASC;


-- =========================================
-- VIEW: FRAGRANCE FREE PRODUCTS
-- =========================================

CREATE OR REPLACE VIEW fragrance_free_products AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price

FROM products p

WHERE NOT EXISTS (

    SELECT 1

    FROM product_ingredients pi

    JOIN ingredients i
    ON pi.ingredient_id = i.id

    WHERE p.id = pi.product_id
    AND i.name = 'Parfum'
);


SELECT *
FROM fragrance_free_products
ORDER BY brand, price;


-- =========================================
-- VIEW: HYDRATING PRODUCTS
-- =========================================

CREATE OR REPLACE VIEW hydrating_products AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            THEN 1
            ELSE 0
        END
    ) AS hydration_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.name IN (
    'dry_skin',
    'dehydrated_skin'
)

AND ie.effect_type = 'good'

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price;


SELECT *
FROM hydrating_products
ORDER BY hydration_score DESC,
price ASC;


-- =========================================
-- VIEW: PRODUCTS WITH RISKY INGREDIENTS
-- =========================================

CREATE OR REPLACE VIEW risky_products AS

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    COUNT(*) AS risky_ingredients_count

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredients i
ON pi.ingredient_id = i.id

WHERE i.name IN (
    'Parfum',
    'Glycolic Acid',
    'Salicylic Acid'
)

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price;


SELECT *
FROM risky_products
ORDER BY risky_ingredients_count DESC;

-- =========================================
-- FUNCTION:
-- GET RECOMMENDATIONS BY SKIN PROBLEM
-- =========================================

CREATE OR REPLACE FUNCTION get_recommendations_by_problem(
    target_problem TEXT
)

RETURNS TABLE (
    product_name TEXT,
    brand TEXT,
    category TEXT,
    price DECIMAL,
    positive_score BIGINT,
    negative_score BIGINT
)

LANGUAGE SQL

AS $$

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1

            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.name = target_problem

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

ORDER BY
    positive_score DESC,
    negative_score ASC,
    p.price ASC;

$$;


SELECT *
FROM get_recommendations_by_problem('acne');


-- =========================================
-- FUNCTION:
-- FILTERED RECOMMENDATIONS
-- =========================================

CREATE OR REPLACE FUNCTION get_filtered_recommendations(
    target_problem TEXT,
    target_category TEXT,
    max_price DECIMAL
)

RETURNS TABLE (
    product_name TEXT,
    brand TEXT,
    category TEXT,
    price DECIMAL,
    positive_score BIGINT,
    negative_score BIGINT
)

LANGUAGE SQL

AS $$

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1

            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE
    sp.name = target_problem
    AND p.category = target_category
    AND p.price <= max_price

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

ORDER BY
    positive_score DESC,
    negative_score ASC,
    p.price ASC;

$$;


SELECT *
FROM get_filtered_recommendations(
    'acne',
    'serum',
    50
);


-- =========================================
-- FUNCTION:
-- SENSITIVE SKIN SAFE PRODUCTS
-- =========================================

CREATE OR REPLACE FUNCTION get_sensitive_skin_safe_products()

RETURNS TABLE (
    product_name TEXT,
    brand TEXT,
    category TEXT,
    price DECIMAL
)

LANGUAGE SQL

AS $$

SELECT
    p.name,
    p.brand,
    p.category,
    p.price

FROM products p

WHERE NOT EXISTS (

    SELECT 1

    FROM product_ingredients pi

    JOIN ingredients i
    ON pi.ingredient_id = i.id

    WHERE pi.product_id = p.id

    AND i.name IN (
        'Parfum',
        'Glycolic Acid'
    )
)

ORDER BY
    p.price ASC;

$$;


SELECT *
FROM get_sensitive_skin_safe_products();


-- =========================================
-- USERS
-- =========================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    age INT,
    skin_type TEXT
);


-- =========================================
-- USER SKIN PROFILES
-- =========================================

CREATE TABLE user_skin_profiles (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    skin_problem_id INT REFERENCES skin_problems(id) ON DELETE CASCADE,

    PRIMARY KEY (
        user_id,
        skin_problem_id
    )
);


-- =========================================
-- USER AVOID INGREDIENTS
-- =========================================

CREATE TABLE user_avoid_ingredients (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,

    PRIMARY KEY (
        user_id,
        ingredient_id
    )
);


-- =========================================
-- TEST USERS
-- =========================================

INSERT INTO users (
    username,
    age,
    skin_type
)

VALUES

(
    'inga',
    22,
    'combination'
),

(
    'anna',
    27,
    'dry'
),

(
    'kate',
    19,
    'oily'
);


-- =========================================
-- USER <-> SKIN PROBLEMS
-- =========================================

INSERT INTO user_skin_profiles (
    user_id,
    skin_problem_id
)

SELECT
    u.id,
    sp.id

FROM users u,
     skin_problems sp

WHERE
    u.username = 'inga'

AND sp.name IN (
    'acne',
    'dehydrated_skin',
    'sensitive_skin'
);

INSERT INTO user_skin_profiles (
    user_id,
    skin_problem_id
)

SELECT
    u.id,
    sp.id

FROM users u,
     skin_problems sp

WHERE
    u.username = 'anna'

AND sp.name IN (
    'dry_skin',
    'dehydrated_skin',
    'sensitive_skin'
);

INSERT INTO user_skin_profiles (
    user_id,
    skin_problem_id
)

SELECT
    u.id,
    sp.id

FROM users u,
     skin_problems sp

WHERE
    u.username = 'kate'

AND sp.name IN (
    'acne',
    'oily_skin'
);


-- =========================================
-- USER AVOID INGREDIENTS
-- =========================================

INSERT INTO user_avoid_ingredients (
    user_id,
    ingredient_id
)

SELECT
    u.id,
    i.id

FROM users u,
     ingredients i

WHERE
    u.username = 'inga'

AND i.name IN (
    'Parfum',
    'Glycolic Acid'
);


INSERT INTO user_avoid_ingredients (
    user_id,
    ingredient_id
)

SELECT
    u.id,
    i.id

FROM users u,
     ingredients i

WHERE
    u.username = 'anna'

AND i.name IN (
    'Parfum'
);


INSERT INTO user_avoid_ingredients (
    user_id,
    ingredient_id
)

SELECT
    u.id,
    i.id

FROM users u,
     ingredients i

WHERE
    u.username = 'kate'

AND i.name IN (
    'Shea Butter'
);


SELECT *
FROM users;


SELECT
    u.username,
    sp.name

FROM user_skin_profiles usp

JOIN users u
ON usp.user_id = u.id

JOIN skin_problems sp
ON usp.skin_problem_id = sp.id;


SELECT
    u.username,
    i.name

FROM user_avoid_ingredients uai

JOIN users u
ON uai.user_id = u.id

JOIN ingredients i
ON uai.ingredient_id = i.id;


-- =========================================
-- FUNCTION:
-- PERSONALIZED RECOMMENDATIONS
-- =========================================

CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    target_username TEXT
)

RETURNS TABLE (
    product_name TEXT,
    brand TEXT,
    category TEXT,
    price DECIMAL,
    positive_score BIGINT,
    negative_score BIGINT,
    matched_problems BIGINT
)

LANGUAGE SQL

AS $$

SELECT
    p.name,
    p.brand,
    p.category,
    p.price,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1

            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) AS negative_score,

    COUNT(DISTINCT sp.name) AS matched_problems

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

JOIN user_skin_profiles usp
ON sp.id = usp.skin_problem_id

JOIN users u
ON usp.user_id = u.id

WHERE
    u.username = target_username

GROUP BY
    p.id,
    p.name,
    p.brand,
    p.category,
    p.price

HAVING

    -- remove products with avoided ingredients
    NOT EXISTS (

        SELECT 1

        FROM product_ingredients pi2

        JOIN user_avoid_ingredients uai
        ON pi2.ingredient_id = uai.ingredient_id

        JOIN users u2
        ON uai.user_id = u2.id

        WHERE
            pi2.product_id = p.id
            AND u2.username = target_username
    )

    -- remove products with negative score
    AND SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) = 0

ORDER BY
    positive_score DESC,
    matched_problems DESC,
    p.price ASC;

$$;


SELECT *
FROM get_personalized_recommendations('inga');


SELECT *
FROM get_personalized_recommendations('anna');


SELECT *
FROM get_personalized_recommendations('kate');


-- =========================================
-- VIEW:
-- USER PROFILE SUMMARY
-- =========================================

CREATE OR REPLACE VIEW user_profile_summary AS

SELECT
    u.username,
    u.skin_type,

    COUNT(DISTINCT usp.skin_problem_id)
    AS skin_problems_count,

    COUNT(DISTINCT uai.ingredient_id)
    AS avoided_ingredients_count

FROM users u

LEFT JOIN user_skin_profiles usp
ON u.id = usp.user_id

LEFT JOIN user_avoid_ingredients uai
ON u.id = uai.user_id

GROUP BY
    u.id,
    u.username,
    u.skin_type;


SELECT *
FROM user_profile_summary;


-- =========================================
-- VIEW:
-- USER SAFE PRODUCTS
-- =========================================

DROP VIEW IF EXISTS user_safe_products;

CREATE VIEW user_safe_products AS

SELECT
    u.username,
    p.name AS product_name,
    p.brand,
    p.category,
    p.price

FROM users u

CROSS JOIN products p

WHERE

-- avoid ingredients
NOT EXISTS (

    SELECT 1

    FROM user_avoid_ingredients uai

    JOIN product_ingredients pi
    ON uai.ingredient_id = pi.ingredient_id

    WHERE
        uai.user_id = u.id
        AND pi.product_id = p.id
)

AND

-- harmful ingredients for user skin problems
NOT EXISTS (

    SELECT 1

    FROM user_skin_profiles usp

    JOIN ingredient_effects ie
    ON usp.skin_problem_id = ie.skin_problem_id

    JOIN product_ingredients pi
    ON ie.ingredient_id = pi.ingredient_id

    WHERE
        usp.user_id = u.id
        AND pi.product_id = p.id
        AND ie.effect_type = 'bad'
);


SELECT *
FROM user_safe_products
WHERE username = 'inga';


-- =========================================
-- FUNCTION:
-- GENERATE SKINCARE ROUTINE
-- =========================================

CREATE OR REPLACE FUNCTION generate_skincare_routine(
    target_username TEXT
)

RETURNS TABLE (
    routine_step TEXT,
    product_name TEXT,
    brand TEXT,
    category TEXT,
    price DECIMAL,
    positive_score BIGINT,
    negative_score BIGINT
)

LANGUAGE SQL

AS $$

WITH scored_products AS (

    SELECT
        p.id,
        p.name,
        p.brand,
        p.category,
        p.price,

        SUM(
            CASE
                WHEN ie.effect_type = 'good'
                AND pi.ingredient_order <= 10
                THEN 2

                WHEN ie.effect_type = 'good'
                THEN 1

                ELSE 0
            END
        ) AS positive_score,

        SUM(
            CASE
                WHEN ie.effect_type = 'bad'
                AND pi.ingredient_order <= 10
                THEN 2

                WHEN ie.effect_type = 'bad'
                THEN 1

                ELSE 0
            END
        ) AS negative_score

    FROM products p

    JOIN product_ingredients pi
    ON p.id = pi.product_id

    JOIN ingredient_effects ie
    ON pi.ingredient_id = ie.ingredient_id

    JOIN skin_problems sp
    ON ie.skin_problem_id = sp.id

    JOIN user_skin_profiles usp
    ON sp.id = usp.skin_problem_id

    JOIN users u
    ON usp.user_id = u.id

    WHERE
        u.username = target_username

        AND NOT EXISTS (

            SELECT 1

            FROM user_avoid_ingredients uai

            JOIN ingredients ai
            ON uai.ingredient_id = ai.id

            JOIN product_ingredients pi2
            ON ai.id = pi2.ingredient_id

            WHERE
                pi2.product_id = p.id
                AND uai.user_id = u.id
        )

    GROUP BY
        p.id,
        p.name,
        p.brand,
        p.category,
        p.price
),

ranked_products AS (

    SELECT *,
    
    ROW_NUMBER() OVER (
        PARTITION BY category
        ORDER BY
            positive_score DESC,
            negative_score ASC,
            price ASC
    ) AS rank_in_category

    FROM scored_products
)

SELECT
    CASE

        WHEN category IN (
            'cleanser',
            'oil',
            'micellar_water'
        )
        THEN 'STEP 1 - CLEANSING'

        WHEN category = 'toner'
        THEN 'STEP 2 - TONER'

        WHEN category = 'serum'
        THEN 'STEP 3 - SERUM'

        WHEN category = 'cream'
        THEN 'STEP 4 - MOISTURIZER'

        WHEN category = 'spf'
        THEN 'STEP 5 - SPF'

        ELSE 'OTHER'

    END AS routine_step,

    name,
    brand,
    category,
    price,
    positive_score,
    negative_score

FROM ranked_products

WHERE rank_in_category = 1
AND negative_score = 0

ORDER BY

CASE

    WHEN category IN (
        'cleanser',
        'oil',
        'micellar_water'
    ) THEN 1

    WHEN category = 'toner' THEN 2

    WHEN category = 'serum' THEN 3

    WHEN category = 'cream' THEN 4

    WHEN category = 'spf' THEN 5

    ELSE 6

END;

$$;


SELECT *
FROM generate_skincare_routine('inga');

SELECT *
FROM generate_skincare_routine('anna');

SELECT *
FROM generate_skincare_routine('kate');


-- =========================================
-- FULL DATABASE TEST
-- TABLE STRUCTURE
-- =========================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;


-- =========================================
-- ALL COLUMNS CHECK
-- =========================================

SELECT
    table_name,
    column_name,
    data_type

FROM information_schema.columns

WHERE table_schema = 'public'

ORDER BY
    table_name,
    ordinal_position;


-- =========================================
-- PRODUCTS COUNT
-- =========================================

SELECT COUNT(*)
FROM products;


-- =========================================
-- INGREDIENTS COUNT
-- =========================================

SELECT COUNT(*)
FROM ingredients;


-- =========================================
-- PRODUCT INGREDIENT RELATIONS COUNT
-- =========================================

SELECT COUNT(*)
FROM product_ingredients;


-- =========================================
-- INGREDIENT EFFECTS COUNT
-- =========================================

SELECT COUNT(*)
FROM ingredient_effects;


-- =========================================
-- USERS COUNT
-- =========================================

SELECT COUNT(*)
FROM users;


-- =========================================
-- ORPHAN RECORDS:
-- PRODUCT_INGREDIENTS WITHOUT PRODUCT
-- =========================================

SELECT *
FROM product_ingredients pi

LEFT JOIN products p
ON pi.product_id = p.id

WHERE p.id IS NULL;


-- =========================================
-- ORPHAN RECORDS:
-- PRODUCT_INGREDIENTS WITHOUT INGREDIENT
-- =========================================

SELECT *
FROM product_ingredients pi

LEFT JOIN ingredients i
ON pi.ingredient_id = i.id

WHERE i.id IS NULL;


-- =========================================
-- ORPHAN RECORDS:
-- INGREDIENT_EFFECTS WITHOUT INGREDIENT
-- =========================================

SELECT *
FROM ingredient_effects ie

LEFT JOIN ingredients i
ON ie.ingredient_id = i.id

WHERE i.id IS NULL;


-- =========================================
-- ORPHAN RECORDS:
-- INGREDIENT_EFFECTS WITHOUT SKIN PROBLEM
-- =========================================

SELECT *
FROM ingredient_effects ie

LEFT JOIN skin_problems sp
ON ie.skin_problem_id = sp.id

WHERE sp.id IS NULL;


-- =========================================
-- DUPLICATE PRODUCTS
-- =========================================

SELECT
    name,
    COUNT(*)

FROM products

GROUP BY name

HAVING COUNT(*) > 1;


-- =========================================
-- DUPLICATE INGREDIENTS
-- =========================================

SELECT
    name,
    COUNT(*)

FROM ingredients

GROUP BY name

HAVING COUNT(*) > 1;


-- =========================================
-- DUPLICATE PRODUCT-INGREDIENT RELATIONS
-- =========================================

SELECT
    product_id,
    ingredient_id,
    COUNT(*)

FROM product_ingredients

GROUP BY
    product_id,
    ingredient_id

HAVING COUNT(*) > 1;


-- =========================================
-- INVALID INCI POSITIONS
-- =========================================

SELECT *
FROM product_ingredients
WHERE ingredient_order <= 0;


-- =========================================
-- EXTREMELY HIGH INCI POSITIONS
-- =========================================

SELECT *
FROM product_ingredients
WHERE ingredient_order > 100;


-- =========================================
-- MOST USED INGREDIENTS
-- =========================================

SELECT
    i.name,
    COUNT(*) AS usage_count

FROM product_ingredients pi

JOIN ingredients i
ON pi.ingredient_id = i.id

GROUP BY i.name

ORDER BY usage_count DESC;


-- =========================================
-- PRODUCTS WITHOUT INGREDIENTS
-- =========================================

SELECT p.name

FROM products p

LEFT JOIN product_ingredients pi
ON p.id = pi.product_id

WHERE pi.product_id IS NULL;


-- =========================================
-- UNUSED INGREDIENTS
-- =========================================

SELECT i.name

FROM ingredients i

LEFT JOIN product_ingredients pi
ON i.id = pi.ingredient_id

WHERE pi.ingredient_id IS NULL;


-- =========================================
-- INGREDIENTS WITHOUT EFFECTS
-- =========================================

SELECT i.name

FROM ingredients i

LEFT JOIN ingredient_effects ie
ON i.id = ie.ingredient_id

WHERE ie.ingredient_id IS NULL;


-- =========================================
-- INGREDIENTS WITH BOTH GOOD AND BAD EFFECTS
-- =========================================

SELECT
    i.name,
    COUNT(DISTINCT ie.effect_type)

FROM ingredient_effects ie

JOIN ingredients i
ON ie.ingredient_id = i.id

GROUP BY i.name

HAVING COUNT(DISTINCT ie.effect_type) > 1;


-- =========================================
-- MOST USEFUL INGREDIENTS
-- =========================================

SELECT
    i.name,
    COUNT(*) AS positive_effects

FROM ingredient_effects ie

JOIN ingredients i
ON ie.ingredient_id = i.id

WHERE ie.effect_type = 'good'

GROUP BY i.name

ORDER BY positive_effects DESC;


-- =========================================
-- FULL PRODUCT SCORING AUDIT
-- =========================================

SELECT
    p.name,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1

            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

GROUP BY p.name

ORDER BY
    positive_score DESC,
    negative_score ASC;


-- =========================================
-- VIEW TEST:
-- ACNE RECOMMENDATIONS
-- =========================================

SELECT *
FROM acne_recommendations
LIMIT 20;


-- =========================================
-- VIEW TEST:
-- SENSITIVE SKIN SAFE PRODUCTS
-- =========================================

SELECT *
FROM sensitive_skin_safe_products
ORDER BY price ASC;


-- =========================================
-- FUNCTION TEST:
-- ACNE RECOMMENDATIONS
-- =========================================

SELECT *
FROM get_recommendations_by_problem('acne');


-- =========================================
-- FUNCTION TEST:
-- DRY SKIN RECOMMENDATIONS
-- =========================================

SELECT *
FROM get_recommendations_by_problem('dry_skin');


-- =========================================
-- FUNCTION TEST:
-- FILTERED RECOMMENDATIONS
-- =========================================

SELECT *
FROM get_filtered_recommendations(
    'acne',
    'serum',
    50
);


-- =========================================
-- FUNCTION TEST:
-- IMPOSSIBLE FILTER
-- =========================================

SELECT *
FROM get_filtered_recommendations(
    'acne',
    'spf',
    10
);


-- =========================================
-- USER PROFILE SUMMARY
-- =========================================

SELECT *
FROM user_profile_summary;


-- =========================================
-- USER SKIN PROBLEMS
-- =========================================

SELECT
    u.username,
    sp.name

FROM user_skin_profiles usp

JOIN users u
ON usp.user_id = u.id

JOIN skin_problems sp
ON usp.skin_problem_id = sp.id

ORDER BY u.username;


-- =========================================
-- USER AVOID INGREDIENTS
-- =========================================

SELECT
    u.username,
    i.name

FROM user_avoid_ingredients uai

JOIN users u
ON uai.user_id = u.id

JOIN ingredients i
ON uai.ingredient_id = i.id

ORDER BY u.username;


-- =========================================
-- PERSONALIZED RECOMMENDATIONS:
-- INGA
-- =========================================

SELECT *
FROM get_personalized_recommendations('inga');


-- =========================================
-- PERSONALIZED RECOMMENDATIONS:
-- ANNA
-- =========================================

SELECT *
FROM get_personalized_recommendations('anna');


-- =========================================
-- PERSONALIZED RECOMMENDATIONS:
-- KATE
-- =========================================

SELECT *
FROM get_personalized_recommendations('kate');


-- =========================================
-- PERSONALIZED RECOMMENDATIONS:
-- INVALID USER
-- =========================================

SELECT *
FROM get_personalized_recommendations('unknown_user');


-- =========================================
-- SAFE PRODUCTS:
-- INGA
-- =========================================

SELECT *
FROM user_safe_products
WHERE username = 'inga';


-- =========================================
-- SAFE PRODUCTS:
-- ANNA
-- =========================================

SELECT *
FROM user_safe_products
WHERE username = 'anna';


-- =========================================
-- SAFE PRODUCTS:
-- KATE
-- =========================================

SELECT *
FROM user_safe_products
WHERE username = 'kate';


-- =========================================
-- ROUTINE GENERATOR:
-- INGA
-- =========================================

SELECT *
FROM generate_skincare_routine('inga');


-- =========================================
-- ROUTINE GENERATOR:
-- ANNA
-- =========================================

SELECT *
FROM generate_skincare_routine('anna');


-- =========================================
-- ROUTINE GENERATOR:
-- KATE
-- =========================================

SELECT *
FROM generate_skincare_routine('kate');


-- =========================================
-- ROUTINE GENERATOR:
-- INVALID USER
-- =========================================

SELECT *
FROM generate_skincare_routine('non_existing_user');


-- =========================================
-- PRODUCTS WITH MORE BAD THAN GOOD SCORES
-- =========================================

SELECT
    p.name,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            THEN 1
            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            THEN 1
            ELSE 0
        END
    ) AS negative_score

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

GROUP BY p.name

HAVING
    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            THEN 1
            ELSE 0
        END
    )

    >

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            THEN 1
            ELSE 0
        END
    );


-- =========================================
-- PRODUCTS WITH ONLY BAD INGREDIENTS
-- =========================================

SELECT
    p.name

FROM products p

JOIN product_ingredients pi
ON p.id = pi.product_id

JOIN ingredient_effects ie
ON pi.ingredient_id = ie.ingredient_id

GROUP BY p.name

HAVING
    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            THEN 1
            ELSE 0
        END
    ) = 0;


-- =========================================
-- FINAL STRESS TEST
-- =========================================

SELECT
    u.username,
    p.name,
    p.category,
    p.price,

    SUM(
        CASE
            WHEN ie.effect_type = 'good'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'good'
            THEN 1

            ELSE 0
        END
    ) AS positive_score,

    SUM(
        CASE
            WHEN ie.effect_type = 'bad'
            AND pi.ingredient_order <= 10
            THEN 2

            WHEN ie.effect_type = 'bad'
            THEN 1

            ELSE 0
        END
    ) AS negative_score

FROM users u

JOIN user_skin_profiles usp
ON u.id = usp.user_id

JOIN skin_problems sp
ON usp.skin_problem_id = sp.id

JOIN ingredient_effects ie
ON sp.id = ie.skin_problem_id

JOIN product_ingredients pi
ON ie.ingredient_id = pi.ingredient_id

JOIN products p
ON pi.product_id = p.id

GROUP BY
    u.username,
    p.name,
    p.category,
    p.price

ORDER BY
    u.username,
    positive_score DESC;