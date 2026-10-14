-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "product_category" AS ENUM ('cleanser', 'toner', 'essence', 'serum', 'moisturizer', 'eye_cream', 'sunscreen', 'mask', 'exfoliant', 'spot_treatment', 'oil', 'other');

-- CreateEnum
CREATE TYPE "routine_step" AS ENUM ('cleanse', 'tone', 'treat', 'moisturize', 'protect');

-- CreateEnum
CREATE TYPE "skin_type" AS ENUM ('dry', 'oily', 'combination', 'normal');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "time_of_day" AS ENUM ('am', 'pm');

-- CreateEnum
CREATE TYPE "shelf_kind" AS ENUM ('own', 'like', 'avoid', 'custom');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "budget" AS ENUM ('lt30', '30_70', '70_150', 'gt150');

-- CreateEnum
CREATE TYPE "spf_usage" AS ENUM ('daily', 'sometimes', 'rarely');

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "cruelty_free" BOOLEAN,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand_id" INTEGER,
    "category" "product_category" NOT NULL,
    "barcode" TEXT,
    "image_url" TEXT,
    "volume_ml" DECIMAL(65,30),
    "price_pln" DECIMAL(8,2),
    "source" TEXT,
    "inci_raw" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce("name", ''))) STORED,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" SERIAL NOT NULL,
    "inci_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "functions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comedogenic" SMALLINT,
    "irritation_risk" SMALLINT,
    "is_fragrance" BOOLEAN NOT NULL DEFAULT false,
    "is_alcohol_drying" BOOLEAN NOT NULL DEFAULT false,
    "description_pl" TEXT,
    "description_en" TEXT,
    "description_uk" TEXT,
    "is_fungal_acne_trigger" BOOLEAN NOT NULL DEFAULT false,
    "is_eu_allergen" BOOLEAN NOT NULL DEFAULT false,
    "is_paraben" BOOLEAN NOT NULL DEFAULT false,
    "is_sulfate" BOOLEAN NOT NULL DEFAULT false,
    "is_silicone" BOOLEAN NOT NULL DEFAULT false,
    "is_oil" BOOLEAN NOT NULL DEFAULT false,
    "is_animal_derived" BOOLEAN NOT NULL DEFAULT false,
    "is_reef_harmful" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_aliases" (
    "alias" TEXT NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "ingredient_aliases_pkey" PRIMARY KEY ("alias")
);

-- CreateTable
CREATE TABLE "product_ingredients" (
    "product_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("product_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "skin_concerns" (
    "id" SMALLINT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "skin_concerns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_effects" (
    "ingredient_id" INTEGER NOT NULL,
    "concern_id" SMALLINT NOT NULL,
    "effect" SMALLINT NOT NULL,
    "evidence" TEXT,

    CONSTRAINT "ingredient_effects_pkey" PRIMARY KEY ("ingredient_id","concern_id")
);

-- CreateTable
CREATE TABLE "ingredient_groups" (
    "id" SMALLINT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "ingredient_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_group_members" (
    "group_id" SMALLINT NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "ingredient_group_members_pkey" PRIMARY KEY ("group_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "ingredient_conflicts" (
    "a_id" INTEGER NOT NULL,
    "b_id" INTEGER NOT NULL,
    "severity" SMALLINT NOT NULL,
    "note_key" TEXT NOT NULL,

    CONSTRAINT "ingredient_conflicts_pkey" PRIMARY KEY ("a_id","b_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "apple_sub" TEXT,
    "google_sub" TEXT,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "skin_type" "skin_type",
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "age_range" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pl',
    "quiz_answers" JSONB,
    "onboarded_at" TIMESTAMPTZ,
    "oil_level" SMALLINT,
    "barrier_level" SMALLINT,
    "sensitivity_level" SMALLINT,
    "budget" "budget",
    "uses_spf" "spf_usage",
    "must_haves" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "profile_concerns" (
    "user_id" UUID NOT NULL,
    "concern_id" SMALLINT NOT NULL,
    "priority" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "profile_concerns_pkey" PRIMARY KEY ("user_id","concern_id")
);

-- CreateTable
CREATE TABLE "avoided_ingredients" (
    "user_id" UUID NOT NULL,
    "ingredient_id" INTEGER NOT NULL,

    CONSTRAINT "avoided_ingredients_pkey" PRIMARY KEY ("user_id","ingredient_id")
);

-- CreateTable
CREATE TABLE "avoided_groups" (
    "user_id" UUID NOT NULL,
    "group_id" SMALLINT NOT NULL,

    CONSTRAINT "avoided_groups_pkey" PRIMARY KEY ("user_id","group_id")
);

-- CreateTable
CREATE TABLE "shelves" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "shelf_kind" NOT NULL,
    "name" TEXT,

    CONSTRAINT "shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_items" (
    "shelf_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shelf_items_pkey" PRIMARY KEY ("shelf_id","product_id")
);

-- CreateTable
CREATE TABLE "scan_history" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" INTEGER,
    "barcode" TEXT,
    "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "time_of_day" "time_of_day" NOT NULL,
    "ai_summary" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_items" (
    "routine_id" INTEGER NOT NULL,
    "step" "routine_step" NOT NULL,
    "product_id" INTEGER,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "routine_items_pkey" PRIMARY KEY ("routine_id","position")
);

-- CreateTable
CREATE TABLE "product_submissions" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "barcode" TEXT,
    "name" TEXT,
    "brand" TEXT,
    "inci_raw" TEXT,
    "status" "submission_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skin_checkins" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "mood" SMALLINT NOT NULL,

    CONSTRAINT "skin_checkins_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "routine_logs" (
    "user_id" UUID NOT NULL,
    "routine_id" INTEGER NOT NULL,
    "day" DATE NOT NULL,
    "done_steps" SMALLINT[] DEFAULT ARRAY[]::SMALLINT[],

    CONSTRAINT "routine_logs_pkey" PRIMARY KEY ("user_id","routine_id","day")
);

-- CreateTable
CREATE TABLE "ai_cache" (
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_search_idx" ON "products" USING GIN ("search");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_inci_name_key" ON "ingredients"("inci_name");

-- CreateIndex
CREATE INDEX "ingredient_aliases_ingredient_id_idx" ON "ingredient_aliases"("ingredient_id");

-- CreateIndex
CREATE INDEX "product_ingredients_ingredient_id_idx" ON "product_ingredients"("ingredient_id");

-- CreateIndex
CREATE UNIQUE INDEX "skin_concerns_code_key" ON "skin_concerns"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_groups_code_key" ON "ingredient_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_apple_sub_key" ON "users"("apple_sub");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "shelves_user_id_idx" ON "shelves"("user_id");

-- CreateIndex
CREATE INDEX "scan_history_user_id_scanned_at_idx" ON "scan_history"("user_id", "scanned_at" DESC);

-- CreateIndex
CREATE INDEX "routines_user_id_idx" ON "routines"("user_id");

-- CreateIndex
CREATE INDEX "product_submissions_status_idx" ON "product_submissions"("status");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_aliases" ADD CONSTRAINT "ingredient_aliases_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_ingredients" ADD CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_effects" ADD CONSTRAINT "ingredient_effects_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_effects" ADD CONSTRAINT "ingredient_effects_concern_id_fkey" FOREIGN KEY ("concern_id") REFERENCES "skin_concerns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_group_members" ADD CONSTRAINT "ingredient_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_group_members" ADD CONSTRAINT "ingredient_group_members_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_conflicts" ADD CONSTRAINT "ingredient_conflicts_a_id_fkey" FOREIGN KEY ("a_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_conflicts" ADD CONSTRAINT "ingredient_conflicts_b_id_fkey" FOREIGN KEY ("b_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_concerns" ADD CONSTRAINT "profile_concerns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_concerns" ADD CONSTRAINT "profile_concerns_concern_id_fkey" FOREIGN KEY ("concern_id") REFERENCES "skin_concerns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoided_ingredients" ADD CONSTRAINT "avoided_ingredients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoided_ingredients" ADD CONSTRAINT "avoided_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoided_groups" ADD CONSTRAINT "avoided_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoided_groups" ADD CONSTRAINT "avoided_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "ingredient_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelves"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_history" ADD CONSTRAINT "scan_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_submissions" ADD CONSTRAINT "product_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skin_checkins" ADD CONSTRAINT "skin_checkins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Hand-written part: what Prisma schema can't express (PLAN.md 3.2, 3.3, 3.6) ───

-- CHECK constraints
ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_comedogenic_check" CHECK ("comedogenic" BETWEEN 0 AND 5),
  ADD CONSTRAINT "ingredients_irritation_risk_check" CHECK ("irritation_risk" BETWEEN 0 AND 3);

ALTER TABLE "product_ingredients"
  ADD CONSTRAINT "product_ingredients_position_check" CHECK ("position" >= 1);

ALTER TABLE "ingredient_effects"
  ADD CONSTRAINT "ingredient_effects_effect_check" CHECK ("effect" BETWEEN -2 AND 2);

ALTER TABLE "ingredient_conflicts"
  ADD CONSTRAINT "ingredient_conflicts_severity_check" CHECK ("severity" BETWEEN 1 AND 2),
  ADD CONSTRAINT "ingredient_conflicts_order_check" CHECK ("a_id" < "b_id");

ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_oil_level_check" CHECK ("oil_level" BETWEEN -3 AND 3),
  ADD CONSTRAINT "profiles_barrier_level_check" CHECK ("barrier_level" BETWEEN 1 AND 3),
  ADD CONSTRAINT "profiles_sensitivity_level_check" CHECK ("sensitivity_level" BETWEEN 0 AND 4);

ALTER TABLE "skin_checkins"
  ADD CONSTRAINT "skin_checkins_mood_check" CHECK ("mood" BETWEEN 1 AND 5);

-- Product flags computed from the ingredient list ("Co jest w środku"), no duplicated data.
CREATE VIEW "product_flags" AS
SELECT p."id" AS "product_id",
  bool_and(NOT i."is_alcohol_drying")         AS "alcohol_free",
  bool_and(NOT i."is_fragrance")              AS "fragrance_free",
  bool_and(NOT i."is_silicone")               AS "silicone_free",
  bool_and(coalesce(i."comedogenic", 0) < 3)  AS "pore_clogger_free",
  bool_and(NOT i."is_eu_allergen")            AS "eu_allergen_free",
  bool_and(NOT i."is_oil")                    AS "oil_free",
  bool_and(NOT i."is_sulfate")                AS "sulfate_free",
  bool_and(NOT i."is_paraben")                AS "paraben_free",
  bool_and(NOT i."is_fungal_acne_trigger")    AS "fungal_acne_safe",
  bool_and(NOT i."is_animal_derived")         AS "vegan",
  bool_and(NOT i."is_reef_harmful")           AS "reef_safe"
FROM "products" p
JOIN "product_ingredients" pi ON pi."product_id" = p."id"
JOIN "ingredients" i ON i."id" = pi."ingredient_id"
GROUP BY p."id";
