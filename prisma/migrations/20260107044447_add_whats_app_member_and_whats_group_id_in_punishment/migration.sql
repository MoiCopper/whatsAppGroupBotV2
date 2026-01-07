/*
  Warnings:

  - Added the required column `whatsAppGroupId` to the `punishments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `whatsAppMemberId` to the `punishments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "punishments" ADD COLUMN     "whatsAppGroupId" TEXT NOT NULL,
ADD COLUMN     "whatsAppMemberId" TEXT NOT NULL;
