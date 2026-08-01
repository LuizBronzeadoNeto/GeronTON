-- CreateEnum
CREATE TYPE "PushTransport" AS ENUM ('expo', 'webpush');

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "transport" "PushTransport" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT,
    "auth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The nullable key columns are the cost of sharing one table between two
-- transports. Prisma cannot express a conditional requirement, so this keeps a
-- webpush row from existing without the encryption keys that sending to it
-- needs. Prisma ignores CHECK constraints when diffing, so it does not report
-- this as drift.
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_webpush_keys_check"
  CHECK (("transport" <> 'webpush') OR ("p256dh" IS NOT NULL AND "auth" IS NOT NULL));
