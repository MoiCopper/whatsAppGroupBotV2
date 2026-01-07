/*
  Warnings:

  - Added the required column `groupId` to the `punishments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `memberId` to the `punishments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "punishments" ADD COLUMN     "groupId" TEXT NOT NULL,
ADD COLUMN     "memberId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "punishments_memberId_idx" ON "punishments"("memberId");

-- CreateIndex
CREATE INDEX "punishments_groupId_idx" ON "punishments"("groupId");

-- AddForeignKey
ALTER TABLE "punishments" ADD CONSTRAINT "punishments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
