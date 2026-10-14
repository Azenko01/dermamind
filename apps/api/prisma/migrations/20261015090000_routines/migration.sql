-- DropIndex
DROP INDEX "routines_user_id_idx";

-- AlterTable
ALTER TABLE "routines" ADD COLUMN     "generated_by" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "routines_user_id_time_of_day_key" ON "routines"("user_id", "time_of_day");


ALTER TABLE "routines"
  ADD CONSTRAINT "routines_generated_by_check" CHECK ("generated_by" IN ('ai', 'rules'));
