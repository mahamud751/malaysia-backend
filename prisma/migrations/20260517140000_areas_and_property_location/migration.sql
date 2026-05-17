-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "areaId" TEXT;
ALTER TABLE "Property" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN "longitude" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
