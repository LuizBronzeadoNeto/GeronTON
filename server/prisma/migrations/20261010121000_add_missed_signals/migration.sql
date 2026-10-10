-- CreateTable
CREATE TABLE "missed_signals" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "reportedById" INTEGER,
    "occurredAt" DATE NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "missed_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "missed_signals_profileId_occurredAt_idx" ON "missed_signals"("profileId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "missed_signals" ADD CONSTRAINT "missed_signals_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missed_signals" ADD CONSTRAINT "missed_signals_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
