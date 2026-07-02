-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('fall', 'fever', 'choking', 'breathing_difficulties', 'bleeding', 'confusion', 'chest_pain', 'other');

-- CreateTable
CREATE TABLE "Intercorrence" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" "EventType" NOT NULL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,

    CONSTRAINT "Intercorrence_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Intercorrence" ADD CONSTRAINT "Intercorrence_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
