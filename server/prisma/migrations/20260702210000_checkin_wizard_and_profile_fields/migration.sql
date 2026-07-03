-- Existing check-ins predate the wizard fields and cannot satisfy the new NOT NULL columns; the product decision was to discard them.
DELETE FROM "check_ins";


-- CreateEnum
CREATE TYPE "Appetite" AS ENUM ('good', 'regular', 'bad');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('very_happy', 'happy', 'neutral', 'sad', 'very_sad');

-- AlterTable
ALTER TABLE "check_ins" DROP COLUMN "choking",
DROP COLUMN "failedComms",
DROP COLUMN "falls",
DROP COLUMN "gaitImpairment",
DROP COLUMN "irregularSleep",
DROP COLUMN "memoryLoss",
DROP COLUMN "socialIsolation",
DROP COLUMN "violenceSign",
DROP COLUMN "weightLoss",
ADD COLUMN     "appetite" "Appetite" NOT NULL,
ADD COLUMN     "bowelRegular" BOOLEAN NOT NULL,
ADD COLUMN     "breathShortness" BOOLEAN NOT NULL,
ADD COLUMN     "calfCircumference" TEXT,
ADD COLUMN     "chokingFrequency" TEXT,
ADD COLUMN     "chokingIncident" BOOLEAN NOT NULL,
ADD COLUMN     "dailyBath" BOOLEAN NOT NULL,
ADD COLUMN     "glycemia" TEXT,
ADD COLUMN     "groomedNails" BOOLEAN NOT NULL,
ADD COLUMN     "hydrationGoal" BOOLEAN NOT NULL,
ADD COLUMN     "medsOnTime" BOOLEAN NOT NULL,
ADD COLUMN     "mood" "Mood" NOT NULL,
ADD COLUMN     "needsFood" TEXT,
ADD COLUMN     "needsHygiene" TEXT,
ADD COLUMN     "needsMedications" TEXT,
ADD COLUMN     "oralHygiene" BOOLEAN NOT NULL,
ADD COLUMN     "otherEvent" TEXT,
ADD COLUMN     "pressure" TEXT,
ADD COLUMN     "saturation" TEXT,
ADD COLUMN     "selfExpression" BOOLEAN NOT NULL,
ADD COLUMN     "skinIssues" BOOLEAN NOT NULL,
ADD COLUMN     "sleepWell" BOOLEAN NOT NULL,
ADD COLUMN     "stimulation" BOOLEAN NOT NULL,
ADD COLUMN     "stressLevel" INTEGER NOT NULL,
ADD COLUMN     "sunExposure" BOOLEAN NOT NULL,
ADD COLUMN     "unstableGait" BOOLEAN NOT NULL,
ADD COLUMN     "weeklyEvents" TEXT[];

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sex" TEXT;

