-- CreateTable
CREATE TABLE "access_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "role" "Role" NOT NULL,
    "day" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_logs_day_idx" ON "access_logs"("day");

-- CreateIndex
CREATE UNIQUE INDEX "access_logs_userId_day_key" ON "access_logs"("userId", "day");

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
