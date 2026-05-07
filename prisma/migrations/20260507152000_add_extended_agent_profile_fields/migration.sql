-- AlterTable
ALTER TABLE "User"
ADD COLUMN "about" TEXT,
ADD COLUMN "responseTime" TEXT,
ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[];
