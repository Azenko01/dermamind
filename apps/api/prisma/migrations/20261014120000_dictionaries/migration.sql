-- Fixed dictionaries used by the quiz (PLAN.md 3.6, 6.1 O7 and O15).
-- Codes must match CONCERNS and AVOID_GROUPS in packages/scoring/src/quiz.ts.
-- Kept in a migration (not the seed) because the app can't work without them in any environment.

INSERT INTO "skin_concerns" ("id", "code") VALUES
  (1, 'breakouts'),
  (2, 'oiliness'),
  (3, 'pores'),
  (4, 'texture'),
  (5, 'dark_spots'),
  (6, 'radiance'),
  (7, 'redness'),
  (8, 'rosacea_prone'),
  (9, 'eczema_prone'),
  (10, 'hydration'),
  (11, 'wrinkles'),
  -- derived from skin type / sensitivity by the Match Score, not picked in O7
  (12, 'dryness'),
  (13, 'sensitivity');

INSERT INTO "ingredient_groups" ("id", "code") VALUES
  (1, 'fragrance'),
  (2, 'drying_alcohol'),
  (3, 'fungal_acne'),
  (4, 'parabens'),
  (5, 'sulfates'),
  (6, 'silicones'),
  (7, 'eu_allergens');
