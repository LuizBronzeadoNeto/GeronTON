-- CreateIndex
CREATE INDEX "Intercorrence_profileId_date_idx" ON "Intercorrence"("profileId", "date" DESC);

-- CreateIndex
CREATE INDEX "alerts_profileId_createdAt_idx" ON "alerts"("profileId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "alerts_checkInId_idx" ON "alerts"("checkInId");

-- CreateIndex
CREATE INDEX "check_ins_profileId_date_idx" ON "check_ins"("profileId", "date" DESC);

-- CreateIndex
CREATE INDEX "medications_profileId_idx" ON "medications"("profileId");

-- CreateIndex
CREATE INDEX "profiles_caregiverId_idx" ON "profiles"("caregiverId");

-- CreateIndex
CREATE INDEX "routines_profileId_idx" ON "routines"("profileId");
