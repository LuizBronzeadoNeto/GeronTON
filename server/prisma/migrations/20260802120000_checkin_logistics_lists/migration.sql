-- The three "Estoque e Logística" answers become lists of items instead of one
-- block of prose. Written by hand because the migration Prisma generates for a
-- TEXT -> TEXT[] change drops and recreates the column, discarding everything
-- caregivers have already recorded. The USING clause converts in place: a value
-- becomes a single-item list, and null or blank becomes an empty one.
--
-- No NOT NULL and no DEFAULT, matching the weeklyEvents column on this table.
-- That is how Prisma represents a scalar list, and adding either would show up
-- as schema drift.
ALTER TABLE "check_ins"
  ALTER COLUMN "needsMedications" TYPE TEXT[] USING (
    CASE
      WHEN "needsMedications" IS NULL OR btrim("needsMedications") = '' THEN '{}'::TEXT[]
      ELSE ARRAY[btrim("needsMedications")]
    END
  );

ALTER TABLE "check_ins"
  ALTER COLUMN "needsHygiene" TYPE TEXT[] USING (
    CASE
      WHEN "needsHygiene" IS NULL OR btrim("needsHygiene") = '' THEN '{}'::TEXT[]
      ELSE ARRAY[btrim("needsHygiene")]
    END
  );

ALTER TABLE "check_ins"
  ALTER COLUMN "needsFood" TYPE TEXT[] USING (
    CASE
      WHEN "needsFood" IS NULL OR btrim("needsFood") = '' THEN '{}'::TEXT[]
      ELSE ARRAY[btrim("needsFood")]
    END
  );
