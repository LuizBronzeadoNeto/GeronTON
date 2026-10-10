-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "resolvedById" INTEGER,
ADD COLUMN     "signalConfirmed" BOOLEAN;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
