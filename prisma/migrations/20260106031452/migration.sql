/*
  Warnings:

  - A unique constraint covering the columns `[whatsAppGroupId]` on the table `groups` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PunishmentType" AS ENUM ('timeout', 'mute', 'ban', 'permanentBan', 'kick', 'warn');

-- AlterTable
ALTER TABLE "groups" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "description" SET DEFAULT '';

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "whatsAppMemberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "numberOfMessages" INTEGER NOT NULL DEFAULT 0,
    "timeoutCount" INTEGER NOT NULL DEFAULT 0,
    "muteCount" INTEGER NOT NULL DEFAULT 0,
    "banCount" INTEGER NOT NULL DEFAULT 0,
    "permanentBanCount" INTEGER NOT NULL DEFAULT 0,
    "kickCount" INTEGER NOT NULL DEFAULT 0,
    "warnCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "punishments" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT NOT NULL,
    "type" "PunishmentType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "punishments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklist" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedBy" TEXT,
    "bannedFromGroupId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_authorId_key" ON "members"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "members_whatsAppMemberId_key" ON "members"("whatsAppMemberId");

-- CreateIndex
CREATE INDEX "members_whatsAppMemberId_idx" ON "members"("whatsAppMemberId");

-- CreateIndex
CREATE INDEX "chat_groups_groupId_idx" ON "chat_groups"("groupId");

-- CreateIndex
CREATE INDEX "chat_groups_memberId_idx" ON "chat_groups"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_groups_groupId_memberId_key" ON "chat_groups"("groupId", "memberId");

-- CreateIndex
CREATE INDEX "punishments_chatGroupId_idx" ON "punishments"("chatGroupId");

-- CreateIndex
CREATE INDEX "punishments_isActive_idx" ON "punishments"("isActive");

-- CreateIndex
CREATE INDEX "punishments_expiresAt_idx" ON "punishments"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "blacklist_memberId_key" ON "blacklist"("memberId");

-- CreateIndex
CREATE INDEX "blacklist_memberId_idx" ON "blacklist"("memberId");

-- CreateIndex
CREATE INDEX "blacklist_createdAt_idx" ON "blacklist"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "groups_whatsAppGroupId_key" ON "groups"("whatsAppGroupId");

-- CreateIndex
CREATE INDEX "groups_whatsAppGroupId_idx" ON "groups"("whatsAppGroupId");

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "punishments" ADD CONSTRAINT "punishments_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
