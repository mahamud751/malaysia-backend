-- AlterTable
ALTER TABLE "PropertyChatMessage" ADD COLUMN "messageType" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "PropertyChatMessage" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "PropertyChatMessage" ADD COLUMN "attachmentName" TEXT;
ALTER TABLE "PropertyChatMessage" ADD COLUMN "attachmentMime" TEXT;
ALTER TABLE "PropertyChatMessage" ADD COLUMN "attachmentSizeBytes" INTEGER;
ALTER TABLE "PropertyChatMessage" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "PropertyChatMessage" ALTER COLUMN "body" SET DEFAULT '';
