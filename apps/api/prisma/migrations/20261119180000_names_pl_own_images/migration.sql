-- Polish ingredient names for the UI and the team's own product photos.
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "own_image" TEXT;

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "name_pl" TEXT;

