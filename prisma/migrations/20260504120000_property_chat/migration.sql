-- CreateTable
CREATE TABLE "PropertyChatThread" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyChatThread_ownerId_idx" ON "PropertyChatThread"("ownerId");

-- CreateIndex
CREATE INDEX "PropertyChatMessage_threadId_createdAt_idx" ON "PropertyChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyChatThread_propertyId_clientId_key" ON "PropertyChatThread"("propertyId", "clientId");

-- AddForeignKey
ALTER TABLE "PropertyChatThread" ADD CONSTRAINT "PropertyChatThread_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChatThread" ADD CONSTRAINT "PropertyChatThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChatThread" ADD CONSTRAINT "PropertyChatThread_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChatMessage" ADD CONSTRAINT "PropertyChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "PropertyChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyChatMessage" ADD CONSTRAINT "PropertyChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
