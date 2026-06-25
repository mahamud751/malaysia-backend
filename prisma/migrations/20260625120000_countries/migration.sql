-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'GBP',
    "mapLatitude" DOUBLE PRECISION,
    "mapLongitude" DOUBLE PRECISION,
    "mapZoom" DOUBLE PRECISION DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- Seed countries
INSERT INTO "Country" ("id", "name", "code", "subtitle", "imageUrl", "defaultCurrency", "mapLatitude", "mapLongitude", "sortOrder", "isActive", "updatedAt")
VALUES
  ('seed_country_malaysia', 'Malaysia', 'MY', 'Discover properties in Malaysia', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=300&auto=format&fit=crop', 'GBP', 3.139, 101.6869, 1, true, CURRENT_TIMESTAMP),
  ('seed_country_portugal', 'Portugal', 'PT', 'Discover properties in Portugal', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=300&auto=format&fit=crop', 'EUR', 38.7223, -9.1393, 2, true, CURRENT_TIMESTAMP),
  ('seed_country_dubai', 'Dubai', 'AE', 'Discover properties in Dubai', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=300&auto=format&fit=crop', 'AED', 25.2048, 55.2708, 3, true, CURRENT_TIMESTAMP);

-- Add countryId to Area
ALTER TABLE "Area" ADD COLUMN "countryId" TEXT;
UPDATE "Area" SET "countryId" = 'seed_country_malaysia' WHERE "countryId" IS NULL;
ALTER TABLE "Area" ALTER COLUMN "countryId" SET NOT NULL;

-- Drop old unique on Area.name
DROP INDEX IF EXISTS "Area_name_key";
CREATE UNIQUE INDEX "Area_countryId_name_key" ON "Area"("countryId", "name");
CREATE INDEX "Area_countryId_idx" ON "Area"("countryId");
ALTER TABLE "Area" ADD CONSTRAINT "Area_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add countryId to Property
ALTER TABLE "Property" ADD COLUMN "countryId" TEXT;
UPDATE "Property" SET "countryId" = 'seed_country_malaysia' WHERE "countryId" IS NULL;
ALTER TABLE "Property" ALTER COLUMN "countryId" SET NOT NULL;
CREATE INDEX "Property_countryId_idx" ON "Property"("countryId");
ALTER TABLE "Property" ADD CONSTRAINT "Property_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
