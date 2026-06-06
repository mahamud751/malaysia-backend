-- CreateTable
CREATE TABLE "AgentReview" (
    "id" TEXT NOT NULL,
    "viewingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentReview_viewingId_key" ON "AgentReview"("viewingId");

-- CreateIndex
CREATE INDEX "AgentReview_agentId_createdAt_idx" ON "AgentReview"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentReview_reviewerId_createdAt_idx" ON "AgentReview"("reviewerId", "createdAt");

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_viewingId_fkey" FOREIGN KEY ("viewingId") REFERENCES "Viewing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentReview" ADD CONSTRAINT "AgentReview_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
