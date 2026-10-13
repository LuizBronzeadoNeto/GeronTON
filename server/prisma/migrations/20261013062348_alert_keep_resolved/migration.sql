-- DropForeignKey
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_checkInId_fkey";

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_ins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
