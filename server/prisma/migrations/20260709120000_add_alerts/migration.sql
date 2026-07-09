-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('weakened_home_bond', 'clinical_warning', 'metabolic_decompensation', 'sarcopenia_risk');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('attention', 'critical');

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "checkInId" INTEGER,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

