-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "cpf" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "crm" TEXT;

-- CreateTable
CREATE TABLE "profile_access" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_access_userId_idx" ON "profile_access"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_access_profileId_userId_key" ON "profile_access"("profileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_cpf_key" ON "profiles"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_crm_key" ON "users"("crm");

-- AddForeignKey
ALTER TABLE "profile_access" ADD CONSTRAINT "profile_access_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_access" ADD CONSTRAINT "profile_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every existing caregiver keeps access to the profiles they own.
-- profiles.caregiverId is retained as the original registrant but is no longer
-- consulted for authorization, so without this every profile would become
-- invisible to its own caregiver the moment this migration lands.
INSERT INTO "profile_access" ("profileId", "userId")
SELECT "id", "caregiverId" FROM "profiles"
ON CONFLICT DO NOTHING;

-- One-off: professionals previously saw every profile implicitly. Link the
-- existing ones so the triage panel is not emptied by this migration. This is
-- only defensible because the database currently holds test data; it must not
-- be repeated in any later migration.
INSERT INTO "profile_access" ("profileId", "userId")
SELECT p."id", u."id" FROM "profiles" p CROSS JOIN "users" u
WHERE u."role" = 'profissional'
ON CONFLICT DO NOTHING;
